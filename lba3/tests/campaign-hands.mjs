// CAMPAIGN-1…3 NO-AIR check for the hero's own hand actions in the campaign thread (story/reach.js): at the moment
// each action takes effect (the act's callback), the right hand's least distance — wrist, palm, fingertips or what it
// holds — to the nearest drawn surface that is not his body (tests/lib/contact.js). Chapter 1: the kitchen tap, Arthur's
// cup taken and set in the sink (a new game, by input); chapter 2: the three pipes felt, the two cocks, the gauge's strip
// (fixture new-04); chapter 3: the chain's wheel, the bell, the feed switch, the cart's bar, its cock, the dial, the
// crank (fixture new-05); CAMPAIGN-4, chapter 4: the cutoff pulled, pushed up, pulled again, the carbon torn off (fixture
// new-07-notebook), chapter 5: the heat line (new-08-routed), and Dallan at the stand's wire both times; CAMPAIGN-5,
// chapter 6: the winch's crank started in the green (fixture new-09-lift, the riders boarded first), the upper brake
// (new-09-top), chapter 7: the telescope's setting lever (new-10-lit); CAMPAIGN-6, chapter 8: the culvert's cock in the
// pump room (new-11-landing; turned until it opens, a kicked-back turn measured too). HAND (default 0.05 m) is the limit, as
// tests/no-air.mjs. Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const ORIGIN = new URL(process.env.GAME_URL || 'http://localhost:8123/').origin;
const HAND = +(process.env.HAND || 0.05);
const save = (name) => { const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8')); for (const o of j.origins || []) o.origin = ORIGIN; return j; };
let page, browser;
const ev = (f, a) => page.evaluate(f, a);
const CONTACT = fileURLToPath(new URL('./lib/contact.js', import.meta.url));
const start = async (name) => {
  ({ browser, page } = await launch(name ? { storageState: save(name) } : {}));
  await open(page, '?nocine'); await menu(page, name ? 'continue' : 'new');
  await page.addScriptTag({ path: CONTACT });
  await ev(() => {
    P.settle(); const h = game.hero; window.GAPS = [];
    const act = h.act.bind(h);
    h.act = (anim, dur, cb, at, next) => act(anim, dur, cb && (() => { game.scene.updateMatrixWorld(true); const r = CT.handGap(h, 'R', CT.roots(), 0.6); window.GAPS.push({ kind: window.KIND, anim, d: r.d == null ? 9 : +r.d.toFixed(3), on: r.name || '' }); return cb(); }), at, next);
  });
};
const use = (kind, sel, near = 1.0) => ev(([kind, sel, near]) => {
  window.KIND = kind; const h = game.hero; const p = new Function('return ' + sel)();
  P.use(p.x, p.z, { near, kind }); for (let i = 0; i < 80 && (h.steer || h.actT > 0); i++) game.step(0.1); P.settle();
  return window.GAPS.filter((g) => g.kind === kind);
}, [kind, sel, near]);
const rows = [], people = [];
const take = (r) => { for (const g of r) rows.push(g); };
// the thread's own people at their work (Kell's hand on the brake, Brel at the trough): workhands.js puts their hands on
// what stands there or stands them down; either is fine, a working hand in the air is not
const person = (id) => ev((id) => {
  const n = game.npcs.find((x) => x.def.id === id); if (!n?.present) return { id, absent: true };
  for (let i = 0; i < 30; i++) game.step(0.05);
  game.scene.updateMatrixWorld(true);
  const want = n.placed?.anim || null, now = n.rig.anim, stood = !!want && now !== want;
  const gap = (s) => { const r = CT.handGap(n, s, CT.roots(), 0.6); return r.d == null ? 9 : +r.d.toFixed(3); };
  return { id, want, now, stood, R: gap('R'), L: gap('L') };
}, id);

// (ONLY10=1: chapter 10's part alone, while working on it)
if (!process.env.ONLY10) {
// chapter 1: a new game, in the kitchen
await start(null);
take(await use('h_tap', 'game.story.chapters[0].home.parts.house.spout', 1.2));
take(await use('h_cup', 'game.story.chapters[0].home.parts.house.stove', 1.2));
await ev(() => { for (let i = 0; i < 40 && !game.flags.pr_cup; i++) { game.step(0.25); P.settle(); } });
take(await ev(() => window.GAPS.filter((g) => g.kind === 'h_cup')).then((a) => a.slice(1)));
await browser.close();

// chapter 2: the pump room
await start('new-04');
await ev(() => { P.talk('zoe', { run: true }); });   // (home first: Zoé, and his own tap, as campaign-thread.mjs A1)
take(await use('ct_tap', 'game.story.chapters[0].home.parts.house.spout', 1.2));
await ev(() => { const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.talk('worker', { run: true }); const K = game.world.pumpKiosk; P.through(K.door.x, K.door.z); P.settle(); });
for (const k of ['copper', 'upper', 'lower']) take(await use('ct_feel', `game.room.pump.feel.${k}`, 0.9).then((a) => a.slice(-1)));
take(await use('ct_cock', 'game.room.pump.cocks.upper', 0.9));
await ev(() => { game.step(3.4); P.settle(); });
take(await use('ct_cock', 'game.room.pump.cocks.lower', 0.9).then((a) => a.slice(-1)));
await ev(() => { game.step(3.6); P.settle(); });
take(await use('ct_strip', 'game.room.pump.gauge', 0.9));
await browser.close();

// chapter 3: the cistern lift and the bench
await start('new-05');
people.push(await person('zl_kell'));
await ev(() => { const L = game.story.cur.lift.L; P.talk('zl_brel', { run: true }); P.go(L.lane.x + 1.5, L.lane.z + 1.5, { tol: 1.0 }); game.step(0.5); P.settle(); P.talk('zl_kell'); P.go(L.spots.stairFoot.x, L.spots.stairFoot.z, { tol: 0.6, maxT: 60 }); P.go(L.spots.stairTop.x, L.spots.stairTop.z, { tol: 0.7, maxT: 60 }); });
take(await use('zt_hook', 'game.story.cur.lift.L.hook'));
await ev(() => { for (let i = 0; i < 60 && !game.flags.zt_hook; i++) { game.step(0.25); P.settle(); } });
take(await use('zt_bell', 'game.story.cur.lift.L.bell'));
await ev(() => { const LT = game.story.cur.lift, L = LT.L, f = game.flags; for (let i = 0; i < 60 && !f.zt_bell; i++) { game.step(0.25); P.settle(); } P.settle(); for (let i = 0; i < 80 && LT.brel; i++) game.step(0.25); P.go(L.feed.front.x, L.feed.front.z - 0.5, { tol: 0.8, maxT: 90 }); });
take(await use('zt_feed', 'game.story.cur.lift.L.feed'));
await ev(() => { const LT = game.story.cur.lift, L = LT.L, f = game.flags; for (let i = 0; i < 80 && !(f.zt_feed && !LT.busy); i++) { game.step(0.25); P.settle(); } P.use(L.deck.x, L.deck.z, { near: 1.9, kind: 'zt_ride' }); for (let i = 0; i < 80 && !f.zt_ride; i++) { game.step(0.25); P.settle(); } P.settle(); });
take(await use('zt_cart', 'game.story.cur.lift.L.cart', 1.3));
await ev(() => { const LT = game.story.cur.lift, f = game.flags; for (let i = 0; i < 60 && !(f.zt_shove && !LT.busy); i++) { game.step(0.25); P.settle(); } });
take(await use('zt_cock', 'game.story.cur.lift.L.cock', 1.3));
await ev(() => { const LT = game.story.cur.lift, f = game.flags; for (let i = 0; i < 80 && !f.zt_water; i++) { game.step(0.25); P.settle(); } P.settle(); P.talk('zl_irsa', { run: true }); });
await ev(() => { const LT = game.story.cur.lift; for (let i = 0; i < 200 && LT.brel; i++) game.step(0.25); });
people.push(await person('zl_brel'));
take(await use('zt_dial', 'game.story.cur.lift.L.dial', 0.9));
take(await use('zt_crank', 'game.story.cur.lift.L.crank', 0.9));
await browser.close();

// chapter 4: the bore test at the post's stand
await start('new-07-notebook');
await ev(() => { const f = game.flags, Post = game.rooms.desert.post; P.go(Post.gate.x - 6, Post.gate.z + 3, { tol: 1.5, run: true, stopWhen: () => f.dt_hail }); P.settle(); });
people.push(await person('dallan'));
take(await use('dt_cut', 'game.rooms.desert.stand.cut.touch()', 0.9));
await ev(() => { for (let i = 0; i < 80 && !game.flags.dt_second; i++) { game.step(0.25); P.settle(); } });
take(await use('dt_cut', 'game.rooms.desert.stand.cut.touch()', 0.9).then((a) => a.slice(-1)));
await ev(() => { const S = game.rooms.desert.stand; let t = 0; while (S.load < 0.97 && t < 15) { game.step(0.25); t += 0.25; } });
take(await use('dt_cut', 'game.rooms.desert.stand.cut.touch()', 0.9).then((a) => a.slice(-1)));
await ev(() => { for (let i = 0; i < 80 && !game.flags.dt_again; i++) { game.step(0.25); P.settle(); } });
take(await use('dt_strip', 'game.rooms.desert.stand.strip', 0.9));
await browser.close();

// chapter 5: the heat line
await start('new-08-routed');
await ev(() => { const f = game.flags, S = game.rooms.desert.stand; P.go(S.board.x - 1.5, S.board.z, { tol: 1.0, run: true, stopWhen: () => f.dt_wire }); P.settle(); });
people.push(await person('dallan'));
take(await use('dt_heat', 'game.rooms.desert.stand.heat.touch()', 0.9));
await browser.close();

// chapter 6: the winch's crank (the riders boarded, then the crank in the green) and the upper brake
await start('new-09-lift');
await ev(() => { const L = game.rooms.hamalayi.line, p = L.crank.touch(); P.use(p.front.x, p.front.z, { kind: 'ps_winch', near: 0.6 }); for (let i = 0; i < 200 && (game.trans || game.story._ps.busy || game.state !== 'play'); i++) { game.step(0.05); if (game.state === 'dialog') P.settle(); } });
take(await ev(() => {
  window.KIND = 'ps_winch'; const G = game, L = G.rooms.hamalayi.line, h = G.hero, p = L.crank.touch();
  P.go(p.front.x, p.front.z, { tol: 0.3 }); P.face(p.x, p.z);
  let t = 0; while (!(L.green() && L.phase() < L.surge + 0.7) && t < 15) { G.step(0.05); t += 0.05; }
  P.tap('KeyE', 0.1); for (let i = 0; i < 40 && (h.steer || h.actT > 0) && G.state === 'play'; i++) G.step(0.1);
  return window.GAPS.filter((g) => g.kind === 'ps_winch');
}));
await browser.close();
await start('new-09-top');
take(await use('ps_brake', 'game.rooms.hamalayi.line.brake.touch()', 0.6));
await browser.close();
// chapter 7: the telescope's setting lever
await start('new-10-lit');
await ev(() => { if (game.room?.id !== 'obsv') { const d = game.rooms.hamalayi.observatory.door; P.through(d.x, d.z); } });
take(await use('ob_set', 'game.rooms.obsv.telescope.lever.touch()', 0.6));
await browser.close();
// chapter 8: the culvert's cock in the pump room (looked at first, then turned until it opens: in a kick it is kicked back)
await start('new-11-landing');
await ev(() => { const K = game.world.pumpKiosk; P.through(K.door.x, K.door.z); P.settle(); const U = game.room?.pump; if (U) { P.use(U.culvert.x, U.culvert.z, { near: 0.9, kind: 'ev_culvert' }); P.settle(); } });
{ let r = []; for (let k = 0; k < 4 && !(await ev(() => !!game.flags.ev_gate)); k++) r = await use('ev_cock', 'game.room.pump.culvert', 0.9); take(r); }   // (use() returns every turn so far)
await browser.close();

// chapter 9 (CAMPAIGN-7): the service door (Kell asked, the ride up; fixture base-12-heard), the carbon laid on the log
// (new-12-drawer), the stop at the console (new-12-vote), the isolator on each relay's terminal and on Kell's feed box
// (new-12-stop); Kell at his brake with the lane dry
await start('base-12-heard');
await ev(() => { const G = game, f = G.flags; P.exitTo('council-out'); P.exitTo('up-archive'); P.settle(); P.exitTo('up-down'); P.talk('zl_kell', { run: true }); for (let i = 0; i < 60 && G.story._cn.kell.busy; i++) G.step(0.1);
  const L = G.rooms.zeelich.lift; P.use(L.deck.x, L.deck.z, { near: 1.9, kind: 'cn_ride' }); for (let i = 0; i < 300 && !(f.cn_kell && G.state === 'play'); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); } });
take(await use('cn_service', 'game.rooms.zeelich.lift.service', 0.9));
await browser.close();
await start('new-12-drawer');
take(await use('cn_compare', 'game.rooms.archive.drawer', 0.6));
await browser.close();
await start('new-12-vote');
await ev(() => { if (game.room?.id === 'council') P.exitTo('council-out'); if (game.room?.id === 'upper') P.exitTo('up-down'); });
take(await use('cn_stop', 'game.rooms.zeelich.platform.stop', 0.8));
await browser.close();
await start('new-12-stop');
people.push(await person('zl_kell'));
await ev(() => { P.enter('workshop', { run: true }); P.settle(); });
take(await use('cn_iso', 'game.rooms.workshop.life.terminals.A', 0.6));
await ev(() => { for (let i = 0; i < 40; i++) { game.step(0.1); P.settle(); } });
take(await use('cn_iso', 'game.rooms.workshop.life.terminals.B', 0.6).then((a) => a.slice(-1)));
await ev(() => { for (let i = 0; i < 40; i++) { game.step(0.1); P.settle(); } P.enter('zeelich'); });
take(await use('cn_clip', 'game.rooms.zeelich.lift.isoAt', 0.6));
await browser.close();

}

if (!process.env.ONLY11) {
// chapter 10 (CAMPAIGN-8, story/netline.js): his hand on each handle as a friend takes it over — the isolator off Kell's
// feed box (base-13, a save from before the wave at the chapter's start: Mill Lane), the valve wheel he holds and the dial
// (new-13-cit), the bore's relief wheel (new-13-desert), the telescope's lever (new-13-ham), the joint (new-13-five) —, and
// each friend's hands on the handle after (Irsa, Mira, Zoé, Ilka, Dallan, Yorna, Pim) and Arthur's on the radio at home
const nwHold = (kind, code) => ev(([kind, code]) => {
  const G = game; window.KIND = kind; new Function(code)();
  for (let i = 0; i < 400 && (G.story._nw?.busy || G.state === 'dialog' || G.hero.actT > 0 || G.hero.steer || G.trans); i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
  P.settle(); return window.GAPS.filter((g) => g.kind === kind && g.anim === 'tinker');
}, [kind, code]);
await start('base-13');
await ev(() => { P.enter('zeelich', { run: true }); P.settle(); });
take(await nwHold('nw_unclip', 'const L = game.rooms.zeelich.lift; P.use(L.isoAt.x, L.isoAt.z, { near: 0.6, run: true, kind: "nw_unclip" });'));
people.push(await person('zl_irsa'));
await browser.close();
await start('new-13-cit');
await ev(() => { if (!P.npc('mira')?.present) P.enter('office', { run: true }); P.talk('mira', { run: true }); P.wait(1.5); P.settle(); for (let i = 0; i < 300 && (game.story._nw?.busy || game.state === 'dialog'); i++) { if (game.state === 'dialog') P.settle(); else game.step(0.1); } });
take(await nwHold('nw_wheel', 'const V = game.rooms.valves; for (let pass = 0; pass < 3 && !game.flags.c10_valves && !game.story._nw.busy; pass++) for (const v of V.valves) { if (game.flags.c10_valves || game.story._nw.busy) break; P.use(v.x, v.z, { near: 0.9 }); P.settle(); }'));
people.push(await person('mira'));
await ev(() => { P.exitTo('valves-out'); if (game.room) { const e = game.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); } P.talk('zoe', { run: true }); });
take(await nwHold('nw_dial', 'const L = game.rooms.lighttop; for (let pass = 0; pass < 3 && !game.flags.c10_light; pass++) for (const i of [1, 2, 3]) { if (game.flags.c10_light || game.story._nw.busy) break; const s = L.searches.find((x) => x.id === "dial" + i); P.use(s.x, s.z, { near: 0.8 }); P.settle(); }'));
people.push(await person('zoe'));
await ev(() => { P.exitTo('outdoor-lighthouse'); P.enter('house', { run: true }); P.settle(); });
people.push(await person('arthur'));
await browser.close();
await start('new-13-desert');
take(await nwHold('nw_relief', 'P.talk("ilka", { run: true }); const b = game.rooms.desert.bore; P.use(b.x, b.z, { run: true });'));
people.push(await person('ilka'));
await browser.close();
await start('new-13-ham');
people.push(await person('dallan'));   // (the bore's fight over: Dallan at the relay; absent off Desert Island, which the check allows)
await ev(() => { if (P.here() !== 'hamalayi' && game.room?.id !== 'obsv') P.flyTo(2); P.talk('yorna', { run: true }); const d = game.rooms.hamalayi.observatory.door; for (let k = 0; k < 3 && game.room?.id !== 'obsv'; k++) { P.through(d.x, d.z, { run: true }); P.settle(); } for (let k = 0; k < 2 && !game.flags.c10_keeper; k++) P.talk('keeper'); const t = game.rooms.obsv.telescope; P.use(t.x, t.z, { kind: 'c10domeRelay' }); P.wait(1); P.settle(); for (let i = 0; i < 100 && game.story._nw?.busy; i++) game.step(0.1); P.settle(); });
take(await nwHold('nw_lever', 'const t = game.rooms.obsv.telescope; P.use(t.x, t.z, { kind: "c10scope" });'));
people.push(await person('yorna'));
people.push(await person('pim'));
await browser.close();
await start('new-13-five');
await ev(() => { const J = game.story._nw.joint(); P.go(J.touch.front.x, J.touch.front.z, { tol: 0.4, run: true }); P.use(J.x, J.z, { run: true, kind: 'nw_joint', near: 0.6 }); for (let i = 0; i < 200 && (game.story._nw.busy || game.state === 'dialog'); i++) { if (game.state === 'dialog') P.settle(); else game.step(0.1); } });
take(await nwHold('nw_joint', 'const G = game, T = G.story._nw, J = T.joint(); P.go(J.touch.front.x, J.touch.front.z, { tol: 0.25, maxT: 8 }); P.face(J.x, J.z); let t = 0; while (!(T.phase() > 1.48 && T.phase() < 1.62) && t < 4) { G.step(1 / 30); t += 1 / 30; } P.tap("KeyE", 0.1);'));
await browser.close();

}

// chapters 11–12 (CAMPAIGN-9, story/answer.js; ONLY11=1: this part alone): the fitters' knocker on the catwalk (new-14-deep);
// in the last act (new-15-last) the branch cock (turned until it holds: a kicked-back turn is measured too), the central lock's
// bar (until it stays up), the main's knocker; Vesk's hands on his key once he has turned it
if (!process.env.ONLY10) {
const SWAIT = 'const G = game; for (let i = 0; i < 500 && (G.story._sh?.busy || G.state === "dialog" || G.hero.actT > 0 || G.hero.steer || G.trans || G.story._sh?.msg); i++) { if (G.state === "dialog") P.settle(); else G.step(0.1); } P.settle();';
const shWait = () => ev((c) => { new Function(c)(); }, SWAIT);
await start('new-14-deep');
await ev(() => { const G = game, D = G.room; const tg = D.ballTargets.find((x) => x.ballSwitch); P.hitTarget(tg, 3.5, { run: false, maxT: 40 }); P.settle(); P.go(D.ladder.x, D.ladder.z - 0.2, { tol: 0.5 }); for (let i = 0; i < 500 && !G.flags.sh_knock; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } });
await shWait();
await ev(() => { const L = game.room.ladder; P.go(L.x, L.z - 5.4, { tol: 0.4 }); });
take(await use('sh_knock', 'game.room.knocker', 0.7));
await shWait();
await browser.close();
await start('new-15-last');
for (let k = 0; k < 5; k++) { take(await use('co_cock', 'game.room.branch', 0.8)); await shWait(); if (await ev(() => !!game.flags.co_branch)) break; await ev(() => { for (let w = 0; w < 40 && game.story._sh.phase() < 1.8; w++) game.step(0.05); }); }
await ev(() => { const G = game; for (let i = 0; i < 600 && !G.flags.co_vesk; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } });
await shWait();
people.push(await person('vesk'));
for (let k = 0; k < 5; k++) { await ev(() => { if (game.flags.co_lock) return; for (let w = 0; w < 80 && !(game.story._sh.phase() > 1.3 && game.story._sh.phase() < 1.6); w++) game.step(0.05); }); take(await use('co_lock', 'game.room.lock.grip', 0.8)); await shWait(); if (await ev(() => !!game.flags.co_lock)) break; }
take(await use('co_knock', 'game.room.coreKnocker', 0.8));
await browser.close();
}

for (const p of people) console.log(`PERSON ${p.id} ${p.want} → ${p.now}${p.stood ? ' (stood down)' : ''}: R ${(p.R * 100).toFixed(1)} cm, L ${(p.L * 100).toFixed(1)} cm`);
check('the thread\'s people: a working hand is on a thing (or the person stands)', people.every((p) => p.absent || !p.want || p.stood || (p.want === 'touchWater' ? p.R : Math.max(p.R, p.L)) <= HAND), people);
// (CAMPAIGN-8: the friends who take a handle over in chapter 10 must not be stood down: their hands are on it, within 1 cm)
const NW = ['zl_irsa', 'mira', 'zoe', 'ilka', 'dallan', 'yorna', 'pim', 'arthur'], NWHAND = +(process.env.NWHAND || 0.012);
const nwp = people.filter((p) => NW.includes(p.id) && !p.absent);
check(`chapter 10's friends at their handles: each working, both hands within ${NWHAND * 100} cm of the handle (not stood down)`, process.env.ONLY11 ? true : nwp.length >= 7 && nwp.every((p) => p.want && !p.stood && Math.max(p.R, p.L) <= NWHAND), nwp);
for (const r of rows) console.log(`HAND ${r.kind} ${r.anim}: ${(r.d * 100).toFixed(1)} cm${r.on ? ' from ' + r.on : ''}`);
const kinds0 = ['h_tap', 'h_cup', 'ct_tap', 'ct_feel', 'ct_cock', 'ct_strip', 'zt_hook', 'zt_bell', 'zt_feed', 'zt_cart', 'zt_cock', 'zt_dial', 'zt_crank', 'dt_cut', 'dt_strip', 'dt_heat', 'ps_winch', 'ps_brake', 'ob_set', 'ev_cock', 'cn_service', 'cn_compare', 'cn_stop', 'cn_iso', 'cn_clip', 'nw_unclip', 'nw_wheel', 'nw_dial', 'nw_relief', 'nw_lever', 'nw_joint', 'sh_knock', 'co_cock', 'co_lock', 'co_knock'];
const kinds = process.env.ONLY10 ? kinds0.filter((k) => k.startsWith('nw_')) : process.env.ONLY11 ? kinds0.filter((k) => /^(sh|co)_/.test(k)) : kinds0;
check('every campaign hand action was reached and measured', kinds.every((k) => rows.some((r) => r.kind === k)), { missing: kinds.filter((k) => !rows.some((r) => r.kind === k)) });
const nwRows = rows.filter((r) => r.kind.startsWith('nw_'));
check(`chapter 10's hand actions (CAMPAIGN-8) each within ${NWHAND * 100} cm of the handle`, process.env.ONLY11 ? true : nwRows.length >= 6 && nwRows.every((r) => r.d <= NWHAND), nwRows);
// (CAMPAIGN-9: chapters 11–12's hand actions and Vesk at his key, within about 1 cm)
const shRows = rows.filter((r) => /^(sh|co)_/.test(r.kind)), vk = people.find((p) => p.id === 'vesk');
check(`chapters 11–12's hand actions (CAMPAIGN-9) each within ${NWHAND * 100} cm of the thing`, process.env.ONLY10 ? true : shRows.length >= 4 && shRows.every((r) => r.d <= NWHAND), shRows);
check(`Vesk at his central lock: working, both hands within ${NWHAND * 100} cm of his key (not stood down)`, process.env.ONLY10 ? true : !!vk && !vk.absent && vk.want && !vk.stood && Math.max(vk.R, vk.L) <= NWHAND, vk);
check(`no campaign hand action in the air (each within ${HAND * 100} cm of a drawn surface)`, rows.length > 0 && rows.every((r) => r.d <= HAND), rows.filter((r) => r.d > HAND));
done();
