// CAMPAIGN-1…3 (docs/lba-maturity/CAMPAIGN-STRENGTHEN.md): the campaign thread of chapters 1–3 against saves, by input
// (tests/lib/player.js: keys held and tapped, time stepped; nothing is teleported and no flag is set).
//
// The continuous run from the dry tap to Irsa's bench, with a Save & quit → Continue between every two segments, is
// the playthrough chain (tests/playthrough/01…06 through tests/lib/seg.mjs with KEEP/LOAD). This suite takes two of
// that chain's own saves (tests/fixtures/campaign/new-04: chapter 2, the water just back; new-05: chapter 3, the
// landing) and four saves made on the build before the thread (base-01, base-03, base-04, base-05) and checks what the
// treatment's acceptance list asks for:
//   A  chapter 2: leaving the pump room mid-task (Save & quit → Continue), the wrong bypass setting and its correction,
//      a save after the partial repair (the bypass set, the strip not taken), the street after, and a return after
//      completion (the garden tap, the kitchen tap, the cocks, the worker, the station's door after a reload)
//   B  chapter 3: a save after the partial repair (the cart hooked), a fall from the upper landing and the retry, the
//      ride, the cistern, the bench (a wrong setting first), Baldino; and a return after completion (the deck, the cart,
//      the standpipe, Kell, Brel and Irsa after a reload)
//   C  the saves from before: each loads and goes on; a step it has passed counts as done, a step ahead of it is played
// ONLY=A|B|C runs one part. SHOTS=<dir> writes a picture of each beat (deviceScaleFactor 1).
import { launch, open, menu, quitAndKeep, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const ORIGIN = new URL(process.env.GAME_URL || 'http://localhost:8123/').origin;
const ONLY = process.env.ONLY, SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'campaign-'));
// a fixture's save, for this run's origin
const save = (name) => { const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8')); for (const o of j.origins || []) o.origin = ORIGIN; return j; };
let page, context, browser;
const ev = (f, a) => page.evaluate(f, a);
const start = async (name) => { ({ browser, context, page } = await launch({ storageState: save(name) })); await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { P.settle(); }); };
// Esc → Save & quit → the title → Continue (the same page: the save is the one the game just wrote)
const handover = async () => { await quitAndKeep(page, context, path.join(TMP, 'hand.json')); await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { P.settle(); }); };
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }).catch(() => {}); };
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };

// ------------------------------------------------------------------ A: chapter 2, the wrong pipe
if (!ONLY || ONLY === 'A') {
  await start('new-04');
  is('A0 the save: chapter 2, the water back, the thread on, the objective sends him home, no door at the station yet',
    await ev(() => { const f = game.flags, L = game.story.cur.line; return [f.chapterKey, !!f.c1_water, L.on, L.open, game.story.doors().some((d) => d.room === 'control'), document.querySelector('#objective').textContent]; }),
    (v) => v[0] === 'project' && v[1] && v[2] && v[3] && v[4] === false && /tap/i.test(v[5]));
  is('A1 home: Zoé (the square is full, our tap is not); his own hand on the tap: dry', await ev(() => {
    const r = P.talk('zoe', { run: true }); const H = game.story.chapters[0].home.parts.house, h = game.hero;
    const t = P.use(H.spout.x, H.spout.z, { near: 1.2, kind: 'ct_tap' }); for (let i = 0; i < 40 && (h.steer || h.actT > 0); i++) game.step(0.25); P.settle();
    return [r.r, !!game.flags.ct_dry, t.target?.kind, H.K.stream.visible];
  }), (v) => v[1] === true && v[2] === 'ct_tap' && v[3] === false);
  await shot('A1-home-dry');
  is('A2 the pump room: the worker, the door, the copper pipe felt', await ev(() => {
    const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.talk('worker', { run: true });
    const K = game.world.pumpKiosk; P.through(K.door.x, K.door.z); P.settle();
    const U = game.room?.pump, h = game.hero; if (!U) return ['not in the room'];
    P.use(U.feel.copper.x, U.feel.copper.z, { near: 0.9, kind: 'ct_feel' }); for (let i = 0; i < 40 && (h.steer || h.actT > 0); i++) game.step(0.25); P.settle();
    return [game.room?.id, !!game.flags.ct_worker, !!game.flags.ct_felt];
  }), (v) => v[0] === 'pumproom' && v[1] && v[2]);
  await shot('A2-pump-room');
  // leaving mid-task: the door lets him out; Save & quit in the lane; Continue
  is('A3 leaving mid-task: the door lets him out with nothing mended', await ev(() => { const e = game.room.exits[0]; const r = P.through(e.x, e.z); P.settle(); return [r.to, game.room?.id ?? 'citadel', !!game.flags.ct_bypass]; }), (v) => v[1] === 'citadel' && v[2] === false);
  await handover();
  is('A3 Save & quit → Continue in the lane: the task as he left it (felt, not mended; the room as found; the worker at the door)', await ev(() => {
    const f = game.flags, K = game.world.pumpKiosk, w = P.npc('worker');
    const r = P.through(K.door.x, K.door.z); P.settle(); const U = game.room?.pump;
    return [!!f.ct_felt, !!f.ct_bypass, +Math.hypot(w.pos.x - K.x, w.pos.z - K.z).toFixed(1), game.room?.id, U && [U.bypass, U.cocks.lower.open, U.cocks.upper.open]];
  }), (v) => v[0] && !v[1] && v[2] < 6 && v[3] === 'pumproom' && v[4] && v[4].every((x) => x === false));
  // failure and retry: the wrong cock, then the right one
  is('A4 the wrong setting: the upper cock sends the water back to the square; it springs shut, Zoé knocks once, nothing is lost', await ev(() => {
    const U = game.room.pump; P.go(U.cocks.upper.front.x, U.cocks.upper.front.z + 0.3, { tol: 0.5 }); game.step(0.6); P.settle();
    P.use(U.cocks.upper.x, U.cocks.upper.z, { near: 0.9, kind: 'ct_cock' }); game.step(3.4); P.settle();
    return [game.flags.ct_wrong, !!game.flags.ct_bypass, U.cocks.upper.open, game.state];
  }), (v) => v[0] === 1 && v[1] === false && v[2] === false && v[3] === 'play');
  is("A4 corrected at once: the lower cock fills the houses' line", await ev(() => {
    const U = game.room.pump; P.use(U.cocks.lower.x, U.cocks.lower.z, { near: 0.9, kind: 'ct_cock' }); game.step(3.6); P.settle();
    return [!!game.flags.ct_bypass, U.cocks.lower.open, U.bypass];
  }), (v) => v.every((x) => x === true));
  await shot('A4-bypass');
  // a save after the partial repair: the bypass set, the strip and the plate not yet
  is('A5 the door waits for the strip and the plate', await ev(() => { const e = game.room.exits[0]; P.through(e.x, e.z); P.settle(); return [game.room?.id, game.story.cur.line.done]; }), (v) => v[0] === 'pumproom' && v[1] === false);
  await handover();
  is('A5 Save & quit → Continue after the partial repair: in the pump room, the bypass set, the strip still on the gauge, the objective for what is left', await ev(() => {
    const U = game.room?.pump, f = game.flags; return [game.room?.id, !!f.ct_bypass, !!f.ct_strip, U && U.bypass, U && U.cocks.lower.open, game.story.objective().replace(/<[^>]+>/g, ' ')];
  }), (v) => v[0] === 'pumproom' && v[1] && !v[2] && v[3] === true && v[4] === true && /strip/i.test(v[5]));
  is("A6 the gauge's strip torn off, the maker's plate read: the way out opens", await ev(() => {
    const U = game.room.pump; P.use(U.gauge.x, U.gauge.z, { near: 0.9, kind: 'ct_strip' }); for (let i = 0; i < 40 && !game.flags.ct_strip; i++) { game.step(0.25); P.settle(); } game.step(2.6); P.settle();
    P.use(U.plate.x, U.plate.z, { near: 0.9, kind: 'ct_plate' }); P.settle();
    const e = game.room.exits[0]; P.through(e.x, e.z); P.settle();
    return [!!game.flags.ct_strip, !!game.flags.ct_plate, game.story.cur.line.done, game.room?.id ?? 'citadel', game.story.items().some((i) => i.id === 'pstrip')];
  }), (v) => v[0] && v[1] && v[2] && v[3] === 'citadel' && v[4]);
  is('A7 the street: the garden tap runs; at home the tap Arthur left open runs until he shuts it', await ev(() => {
    const hm = game.story.chapters[0].home.parts, Y = hm.yard, H = hm.house, h = game.hero;
    const yard = Y.stream.visible; P.talk('zoe', { run: true }); const ran = H.K.stream.visible;
    P.use(H.spout.x, H.spout.z, { near: 1.2, kind: 'ct_tap' }); for (let i = 0; i < 40 && !game.flags.ct_tapShut; i++) { game.step(0.25); P.settle(); }
    return [yard, !!game.flags.ct_home, ran, !!game.flags.ct_tapShut, H.K.stream.visible];
  }), (v) => v[0] && v[1] && v[2] && v[3] && v[4] === false);
  await shot('A7-home-runs');
  // returning after completion
  await handover();
  is('A8 Save & quit → Continue after completion: the garden tap still runs, the kitchen tap stays shut, the cocks as he set them, the worker back at the station, the station has its door, the shopkeeper at her counter', await ev(() => {
    const f = game.flags, hm = game.story.chapters[0].home.parts, U = game.regions.ensure('pumproom', 'test').pump, w = P.npc('worker'), K = game.world.pumpKiosk;
    return [hm.yard.stream.visible, hm.house.K.stream.visible, U.bypass, U.cocks.lower.open, U.cocks.upper.open, !!f.ct_wback, Math.hypot(w.pos.x - K.x, w.pos.z - K.z) > 100, game.story.doors().some((d) => d.room === 'control'), P.npc('pippa').placed?.anim, game.story.cur.line.done];
  }), (v) => v[0] === true && v[1] === false && v[2] === true && v[3] === true && v[4] === false && v[5] && v[6] && v[7] && v[8] === 'wipe' && v[9] === true);
  is("A9 the station: Vesk's tour, the strip shown (\"a new pump settling\")", await ev(() => { const r = P.talk('vesk', { run: true }); return [r.r, !!game.flags.c1_tour, r.lines]; }), (v) => v[1] === true && v[2] >= 9);
  await browser.close();
}

// ------------------------------------------------------------------ B: chapter 3, the cistern lift and the bench
if (!ONLY || ONLY === 'B') {
  await start('new-05');
  is('B0 the save: chapter 3, landed with the strip: the thread on, the lift stuck half way, no marker for the works', await ev(() => {
    const f = game.flags, LT = game.story.cur.lift, L = LT.L;
    return [f.chapterKey, !!f.ct_strip, LT.on, LT.open, +(L.deckY - L.half).toFixed(2), game.story.cur.markers().length, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'zeelich' && v[1] && v[2] && v[3] && v[4] === 0 && v[5] === 0 && /Irsa/.test(v[6]));
  await shot('B0-landing');
  is('B1 Brel at the bridge gives the way; the lift seen from the lane; Kell will not let go of the brake', await ev(() => {
    const L = game.story.cur.lift.L, f = game.flags;
    P.talk('zl_brel', { run: true }); P.go(L.lane.x + 1.5, L.lane.z + 1.5, { tol: 1.0 }); game.step(0.5); P.settle(); P.talk('zl_kell');
    return [!!f.zt_brel, !!f.zt_seen, !!f.zt_kell, P.npc('zl_kell').placed?.anim];
  }), (v) => v[0] && v[1] && v[2] && v[3] === 'use');
  await shot('B1-lift-stuck');
  is("B2 up the stair to the upper landing; the bell waits for the hook; the frame's chain let down onto the cart", await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, h = game.hero;
    P.go(L.spots.stairFoot.x, L.spots.stairFoot.z, { tol: 0.6, maxT: 60 }); P.go(L.spots.stairTop.x, L.spots.stairTop.z, { tol: 0.7, maxT: 60 });
    const up = +(h.pos.y - L.top).toFixed(2);
    P.use(L.bell.x, L.bell.z, { near: 1.0, kind: 'zt_bell' }); const early = !!f.zt_bell;
    P.use(L.hook.x, L.hook.z, { near: 1.0, kind: 'zt_hook' }); for (let i = 0; i < 60 && !f.zt_hook; i++) { game.step(0.25); P.settle(); }
    return [up, early, !!f.zt_hook, L.state.hooked];
  }), (v) => Math.abs(v[0]) < 0.1 && v[1] === false && v[2] && v[3]);
  await shot('B2-hooked');
  // a save after the partial repair
  await handover();
  is('B3 Save & quit → Continue after the partial repair: on the upper landing, the cart still hooked, the deck still half way, Kell still at the brake', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, h = game.hero;
    return [!!f.zt_hook, !!f.zt_bell, L.state.hooked, +(L.deckY - L.half).toFixed(2), +(h.pos.y - L.top).toFixed(1), P.npc('zl_kell').placed?.anim, game.story.objective().replace(/<[^>]+>/g, ' ')];
  }), (v) => v[0] && !v[1] && v[2] === true && v[3] === 0 && Math.abs(v[4]) < 0.2 && v[5] === 'use' && /bell/i.test(v[6]));
  // a fall at the lift: off the open bay; alive, the task as it was; up again
  is('B4 a fall at the lift: off the open bay onto the deck and the lane; he lives, nothing of the task is lost', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, h = game.hero, hp0 = h.hp;
    P.go(L.bay.x - 0.6, L.bay.z, { tol: 0.4, maxT: 20, fight: false });
    P.face(L.lane.x, L.lane.z); P.holdFor(['ArrowUp'], 2.4); game.step(1.0); P.settle();
    if (h.pos.y > L.y0 + 1) { P.face(L.lane.x, L.lane.z); P.holdFor(['ArrowUp'], 2.0); game.step(1.0); P.settle(); }
    return [+(h.pos.y - L.y0).toFixed(2), hp0, h.hp, h.dead, !!f.zt_fall, !!f.zt_hook, L.state.hooked, game.state];
  }), (v) => v[0] < 0.3 && v[2] > 0 && !v[3] && v[4] && v[5] && v[6] && v[7] === 'play');
  is('B5 the retry: up again, the bell rung; Kell clears the lane and Vesk gives the lift the mill line', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags;
    P.go(L.spots.stairFoot.x, L.spots.stairFoot.z, { tol: 0.6, maxT: 60 }); P.go(L.spots.stairTop.x, L.spots.stairTop.z, { tol: 0.7, maxT: 60 });
    P.use(L.bell.x, L.bell.z, { near: 1.0, kind: 'zt_bell' }); for (let i = 0; i < 60 && !f.zt_bell; i++) { game.step(0.25); P.settle(); } P.settle();
    const b = P.npc('zl_brel'); for (let i = 0; i < 80 && LT.brel; i++) game.step(0.25);
    return [!!f.zt_bell, +Math.hypot(b.pos.x - L.spots.brelClear.x, b.pos.z - L.spots.brelClear.z).toFixed(1), game.story.objective().replace(/<[^>]+>/g, ' ')];
  }), (v) => v[0] && v[1] < 1.2 && /mill line|motor/i.test(v[2]));
  is('B6 the feed switch thrown: the motor runs, the deck comes down; he steps on beside the cart and rides up with it', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, h = game.hero;
    P.go(L.feed.front.x, L.feed.front.z - 0.5, { tol: 0.8, maxT: 90 });
    P.use(L.feed.x, L.feed.z, { near: 1.0, kind: 'zt_feed' }); for (let i = 0; i < 80 && !(f.zt_feed && !LT.busy); i++) { game.step(0.25); P.settle(); }
    const low = +(L.deckY - L.low).toFixed(2), running = L.running;
    P.use(L.deck.x, L.deck.z, { near: 1.9, kind: 'zt_ride' }); for (let i = 0; i < 80 && !f.zt_ride; i++) { game.step(0.25); P.settle(); } P.settle();
    return [!!f.zt_feed, low, running, !!f.zt_ride, +(h.pos.y - L.top).toFixed(2), +(L.deckY - L.top).toFixed(2), +Math.hypot(h.pos.x - L.deck.x, h.pos.z - L.deck.z).toFixed(1)];
  }), (v) => v[0] && v[1] === 0 && v[2] && v[3] && Math.abs(v[4]) < 0.05 && v[5] === 0 && v[6] < 1.3);
  await shot('B6-rode-up');
  is('B7 the cart shoved along its rails to the filler, its cock opened: the cistern fills, the standpipe runs, Brel fills up', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags;
    P.use(L.cart.x, L.cart.z, { near: 1.3, kind: 'zt_cart' }); for (let i = 0; i < 60 && !(f.zt_shove && !LT.busy); i++) { game.step(0.25); P.settle(); }
    const k = +L.cartK.toFixed(2);
    P.use(L.cartEnd.x - 1.12, L.cartEnd.z, { near: 1.3, kind: 'zt_cock' }); for (let i = 0; i < 80 && !f.zt_water; i++) { game.step(0.25); P.settle(); } P.settle();
    for (let i = 0; i < 200 && LT.brel; i++) game.step(0.25);
    const b = P.npc('zl_brel');
    return [!!f.zt_shove, k, !!f.zt_water, L.state.water, +Math.hypot(b.pos.x - L.spots.brelTap.x, b.pos.z - L.spots.brelTap.z).toFixed(1), b.placed?.anim];
  }), (v) => v[0] && v[1] === 1 && v[2] && v[3] === true && v[4] < 1.2 && v[5] === 'use');
  await shot('B7-cistern');
  is("B8 Irsa's bench: a wrong setting cranked answers too (no proof); set to the strip, the needle kicks the other way: the proof", await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, h = game.hero;
    const idle = () => { for (let i = 0; i < 60 && (h.steer || h.actT > 0); i++) game.step(0.25); P.settle(); };
    P.talk('zl_irsa', { run: true }); const asked = !!f.zt_irsa2;
    P.use(L.crank.x, L.crank.z, { near: 0.9, kind: 'zt_crank' }); idle(); game.step(3.4); P.settle(); const wrong = !f.zt_bench;
    for (let k = 0; k < 2; k++) { P.use(L.dial.x, L.dial.z, { near: 0.9, kind: 'zt_dial' }); idle(); }
    const dial = LT.dial;
    P.use(L.crank.x, L.crank.z, { near: 0.9, kind: 'zt_crank' }); idle(); for (let i = 0; i < 60 && !f.zt_bench; i++) { game.step(0.25); P.settle(); }
    return [asked, wrong, dial, !!f.zt_bench, game.story.items().some((i) => i.id === 'pstrip')];
  }), (v) => v[0] && v[1] && v[2] === 2 && v[3] && v[4] === false);
  await shot('B8-bench');
  is('B9 Baldino, who would not start without the proof, starts', await ev(() => { const r = P.talk('baldino', { run: true }); return [r.r, !!game.flags.c2_plan, game.story.cur.markers().length]; }), (v) => v[1] === true && v[2] > 0);
  // returning after completion
  await handover();
  is('B10 Save & quit → Continue after completion: the deck at the top, the cart at the filler, the cistern full, the standpipe running; Kell at his lever (no hand on the brake), Brel at the tap, Irsa at her bench; their words follow', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, S = L.spots, d = (id, s) => { const n = P.npc(id); return n.present ? +Math.hypot(n.pos.x - s.x, n.pos.z - s.z).toFixed(1) : -1; };
    const out = [+(L.deckY - L.top).toFixed(2), L.cartK, L.state.water, d('zl_kell', S.kell), P.npc('zl_kell').placed?.anim ?? null, d('zl_brel', S.brelTap), d('zl_irsa', S.irsa)];
    const e = game.room?.exits?.find((x) => !x.room && game.room.id === 'workshop'); if (e) { P.through(e.x, e.z); P.settle(); }
    const r = P.talk('zl_kell', { run: true }); out.push(r.lines ?? r.r);
    return out;
  }), (v) => v[0] === 0 && v[1] === 1 && v[2] === true && v[3] >= 0 && v[3] < 1 && v[4] === null && v[5] >= 0 && v[5] < 1.5 && v[6] >= 0 && v[6] < 1 && v[7] >= 1);   // (the places are read before he walks out of Baldino's workshop to Kell)
  await browser.close();
}

// ------------------------------------------------------------------ C: saves from before the thread
if (!ONLY || ONLY === 'C') {
  await start('base-01');
  is('C1 a save from before, mid-chapter 1 (in the well): loads; the home steps count as done (the cup in the sink, the growth grown), the cave plays as it did', await ev(() => {
    const f = game.flags, hm = game.story.chapters[0].home, H = hm.parts.house, C = hm.parts.cave;
    return [f.chapterKey ?? f.chapter, game.room?.id, !!f.pr_v2, hm.on, +Math.hypot(H.cup.position.x - H.sinkAt.x, H.cup.position.z - H.sinkAt.z).toFixed(2), C.lean, game.state];
  }), (v) => v[1] === 'well' && v[2] === false && v[3] === false && v[4] < 0.05 && v[5] === 1 && v[6] === 'play');
  await browser.close();
  await start('base-03');
  is('C2 a save from before, mid-chapter 2 (the valves ahead): loads; the pump room is ahead of it, so the thread is on (the room shut until the water is back)', await ev(() => {
    const f = game.flags, L = game.story.cur.line; return [f.chapterKey, !!f.c1_water, f.ct_v, L.on, L.done, game.story.doors().some((d) => d.room === 'pumproom'), game.state];
  }), (v) => v[0] === 'project' && v[1] === false && v[2] === 1 && v[3] && v[4] === false && v[5] === false && v[6] === 'play');
  await browser.close();
  await start('base-04');
  is('C3 a save from before, chapter 2 with the water already back: loads; the pump room counts as done (the bypass set right, the station has its door, the room can be visited)', await ev(() => {
    const f = game.flags, L = game.story.cur.line, U = game.regions.ensure('pumproom', 'test').pump;
    return [f.chapterKey, !!f.c1_water, !!f.ct_v, L.done, game.story.doors().some((d) => d.room === 'control'), game.story.doors().some((d) => d.room === 'pumproom'), U.bypass, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'project' && v[1] && v[2] === false && v[3] && v[4] && v[5] && v[6] === true && /Vesk/.test(v[7]));
  is("C3 and it goes on: Vesk's tour", await ev(() => { const r = P.talk('vesk', { run: true }); return [!!game.flags.c1_tour]; }), (v) => v[0] === true);
  await browser.close();
  await start('base-05');
  is('C4 a save from before, chapter 3 at the landing (no strip): loads; the lift is mended, the cistern full, Mill Lane lived in, and Baldino starts at once', await ev(() => {
    const f = game.flags, LT = game.story.cur.lift, L = LT.L;
    const st = [f.chapterKey, LT.on, +(L.deckY - L.top).toFixed(2), L.cartK, L.state.water, ['zl_kell', 'zl_brel', 'zl_irsa'].every((id) => P.npc(id)?.present)];
    const r = P.talk('baldino', { run: true });
    return [...st, !!f.c2_plan];
  }), (v) => v[0] === 'zeelich' && v[1] === false && v[2] === 0 && v[3] === 1 && v[4] === true && v[5] && v[6] === true);
  await browser.close();
}
done();
fs.rmSync(TMP, { recursive: true, force: true });
