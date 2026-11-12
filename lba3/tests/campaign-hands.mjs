// CAMPAIGN-1…3 NO-AIR check for the hero's own hand actions in the campaign thread (story/reach.js): at the moment
// each action takes effect (the act's callback), the right hand's least distance — wrist, palm, fingertips or what it
// holds — to the nearest drawn surface that is not his body (tests/lib/contact.js). Chapter 1: the kitchen tap, Arthur's
// cup taken and set in the sink (a new game, by input); chapter 2: the three pipes felt, the two cocks, the gauge's strip
// (fixture new-04); chapter 3: the chain's wheel, the bell, the feed switch, the cart's bar, its cock, the dial, the
// crank (fixture new-05); CAMPAIGN-4, chapter 4: the cutoff pulled, pushed up, pulled again, the carbon torn off (fixture
// new-07-notebook), chapter 5: the heat line (new-08-routed), and Dallan at the stand's wire both times. HAND (default
// 0.05 m) is the limit, as tests/no-air.mjs. Automated runtime only.
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

for (const p of people) console.log(`PERSON ${p.id} ${p.want} → ${p.now}${p.stood ? ' (stood down)' : ''}: R ${(p.R * 100).toFixed(1)} cm, L ${(p.L * 100).toFixed(1)} cm`);
check('the thread\'s people: a working hand is on a thing (or the person stands)', people.every((p) => p.absent || !p.want || p.stood || (p.want === 'touchWater' ? p.R : Math.max(p.R, p.L)) <= HAND), people);
for (const r of rows) console.log(`HAND ${r.kind} ${r.anim}: ${(r.d * 100).toFixed(1)} cm${r.on ? ' from ' + r.on : ''}`);
const kinds = ['h_tap', 'h_cup', 'ct_tap', 'ct_feel', 'ct_cock', 'ct_strip', 'zt_hook', 'zt_bell', 'zt_feed', 'zt_cart', 'zt_cock', 'zt_dial', 'zt_crank', 'dt_cut', 'dt_strip', 'dt_heat'];
check('every campaign hand action was reached and measured', kinds.every((k) => rows.some((r) => r.kind === k)), { missing: kinds.filter((k) => !rows.some((r) => r.kind === k)) });
check(`no campaign hand action in the air (each within ${HAND * 100} cm of a drawn surface)`, rows.length > 0 && rows.every((r) => r.d <= HAND), rows.filter((r) => r.d > HAND));
done();
