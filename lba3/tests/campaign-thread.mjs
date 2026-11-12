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
//      (chapters 1–3; and CAMPAIGN-4: base-06 chapter 4 at the pier, base-07-dig chapter 4 with the dig open, base-07
//      chapter 5 in Kesh, all three made on the build before the bore test)
//   D  chapter 4 (CAMPAIGN-4, story/digtest.js; fixture new-07-notebook: the notebook just taken): Dallan's hail, the first
//      cut and the kicks after it, a save between the two cut-offs, the dark keypad (leaving mid-task), a cut too soon
//      (failure and retry), the second run, the carbon, the keypad live; a return after completion
//   E  chapter 5 (fixture new-08-routed: FunFrock's valves just set): the wire, a save before the heat line, the heat
//      line, the log sent, Dallan before and after the tape is read; a return after completion
//   C8–C11 (CAMPAIGN-5) the saves from before wave 3: base-09 chapter 6 at the landing (the trips ahead: the thread on),
//      base-09-trip1 chapter 6 between the trips (no thread: the old trip, no brake), base-10 chapter 7 at the monastery
//      (the telescope ahead: on), base-10-scope chapter 7 with the telescope turned (no thread: the drone next)
//   F  chapter 6 (CAMPAIGN-5, story/passline.js; fixture new-09-lift: the rope just cut): the riders boarded and the line
//      read, leaving mid-task (Save & quit with them boarded), a start too late and the retry, the trip in the green, the
//      second trip, a save between the trips; fixture new-09-top (he has just ridden up): a save before the brake, the
//      monastery waiting, the brake and the last of Lhar, a return after completion
//   G  chapter 7 (fixture new-10-lit: the crystal just lit): the fourth setting by hand, a save between the follow and the
//      reading, the ring read, the glacier's turn, a return after completion
//   H  (CAMPAIGN-6) the saves from before wave 4: base-11 chapter 8 at its start (the lane ahead: the thread on, the
//      arrival's cut-away plays), base-11-town with the town's shelters open (on; the arrival counts as seen), base-11-relay
//      with Zoé's run behind it (no thread: the gate open, the control room next)
//   I  chapter 8's lane (CAMPAIGN-6, story/laneline.js; fixture new-11-town: the shelters open, Zoé's run ahead): the run,
//      the board half read and Save & quit (her run resumes before it), the run again to the landing; fixture
//      new-11-landing (Twinsen at the landing): the pump room, a Save & quit there, the cock kicked back in a kick and
//      turned in the rest, a save before the boarding, the boarding, the bridge after a reload, the landing revisited
//   J  (CAMPAIGN-7) the saves from before wave 5: base-12 chapter 9 at its start (the thread on: its stop is ahead),
//      base-12-heard after the hearing (the archive's door shut by Vesk's order: Kell next), base-12-plans with the plans in
//      hand in the archive (the gallery and the log count as done; the vote orders the stop, the chapter goes on)
//   K  chapter 9's thread (CAMPAIGN-7, story/cnline.js, zeelift.js KellThread; fixtures from this wave's playthrough): the
//      order, Kell, a Save & quit with the deck down for them, the ride, a Save & quit at the service door, the gallery,
//      leaving by the gallery mid-task and back in; the BORE drawer open and a Save & quit before the carbon is laid on the
//      log; the stop at the console and a Save & quit with Mill Lane dry; the bench with one relay clipped and a Save &
//      quit; the other relay; the isolator on Kell's feed → chapter 10, and Mill Lane after a reload there
// ONLY=A|B|C|D|E|F|G|H|I|J|K runs one part. SHOTS=<dir> writes a picture of each beat (deviceScaleFactor 1).
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
  is('A7 the street: the garden tap runs; at home the tap Arthur left open runs cold under his hand (it is shut by the time he comes back in)', await ev(() => {
    const hm = game.story.chapters[0].home.parts, Y = hm.yard, H = hm.house, h = game.hero;
    const yard = Y.stream.visible; P.talk('zoe', { run: true }); const ran = H.K.stream.visible;
    P.use(H.spout.x, H.spout.z, { near: 1.2, kind: 'ct_tap' }); for (let i = 0; i < 40 && !game.flags.ct_tapShut; i++) { game.step(0.25); P.settle(); }
    const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle(); const d = game.world.houses[0].door; P.through(d.x, d.z); P.settle();
    return [yard, !!game.flags.ct_home, ran, !!game.flags.ct_tapShut, game.room?.id, H.K.stream.visible];
  }), (v) => v[0] && v[1] && v[2] && v[3] && v[4] === 'house' && v[5] === false);
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
    P.use(L.cock.x, L.cock.z, { near: 1.3, kind: 'zt_cock' }); for (let i = 0; i < 80 && !f.zt_water; i++) { game.step(0.25); P.settle(); } P.settle();
    for (let i = 0; i < 200 && LT.brel; i++) game.step(0.25);
    const b = P.npc('zl_brel');
    return [!!f.zt_shove, k, !!f.zt_water, L.state.water, +Math.hypot(b.pos.x - L.spots.brelTap.x, b.pos.z - L.spots.brelTap.z).toFixed(1), b.placed?.anim];
  }), (v) => v[0] && v[1] === 1 && v[2] && v[3] === true && v[4] < 1.2 && v[5] === 'kneelWork');
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
  // CAMPAIGN-4: chapters 4 and 5 from before the bore test
  await start('base-06');
  is('C5 a save from before, chapter 4 at Kesh\'s pier: loads; the bore test is ahead of it, so the thread is on (the drill turning, Dallan at his place in the post until the notebook); it goes on: Tarra', await ev(() => {
    const f = game.flags, T = game.story._dt, S = game.regions.built('desert').stand, n = P.npc('dallan');
    const st = [f.chapterKey, f.dt_v, T.on, S.spinning, +Math.hypot(n.pos.x - S.spots.dallan.x, n.pos.z - S.spots.dallan.z).toFixed(1)];
    P.talk('tarra', { run: true }); return [...st, !!f.c4_pumpTask];
  }), (v) => v[0] === 'dig' && v[1] === 1 && v[2] && v[3] && v[4] > 5 && v[5]);
  await browser.close();
  await start('base-07-dig');
  is('C6 a save from before, chapter 4 with the dig gate already open: loads; the test counts as done (no thread, the drill stopped, Dallan in the post, the keypad as before, no carbon asked for)', await ev(() => {
    const f = game.flags, T = game.story._dt, S = game.regions.built('desert').stand, n = P.npc('dallan'), D = game.regions.built('desert');
    return [f.chapterKey, !!f.c4_digOpen, !!f.dt_v, T.on, S.spinning, +Math.hypot(n.pos.x - D.npcSpots.dallan.x, n.pos.z - D.npcSpots.dallan.z).toFixed(1), document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'dig' && v[1] && !v[2] && !v[3] && v[4] === false && v[5] < 2 && !/test/i.test(v[6]));
  await browser.close();
  await start('base-07');
  is('C7 a save from before, chapter 5 in Kesh: loads; no thread (the pump\'s drive cold, the heat line on the bore, nothing sent, Dallan not at the stand); Brosk\'s jar goes on as before', await ev(() => {
    const f = game.flags, T = game.story._dt, D = game.regions.built('desert'), S = D.stand, n = P.npc('dallan');
    const st = [f.chapterKey, T.on, D.pump.drive.hot, S.heat.on, !!f.dt_sent, n.present ? +Math.hypot(n.pos.x - S.spots.dallan.x, n.pos.z - S.spots.dallan.z).toFixed(1) : 99];
    P.talk('dtrader', { run: true }); return [...st, !!f.c5_jar];
  }), (v) => v[0] === 'steam' && !v[1] && v[2] === false && v[3] === false && !v[4] && v[5] > 3 && v[6]);
  await browser.close();
  // CAMPAIGN-5: the saves from before wave 3
  await start('base-09');
  is('C8 a save from before, chapter 6 at the landing: loads; the trips are ahead of it, so the thread is on (the line kicking); it goes on: the tree over the gorge', await ev(() => {
    const f = game.flags, T = game.story._ps, L = game.regions.built('hamalayi').line; let k = 0; const k0 = L.onKick; L.onKick = (i) => { k++; k0?.(i); };
    for (let i = 0; i < 260; i++) game.step(0.05); L.onKick = k0;
    const st = [f.chapterKey, f.ps_v, T.on6, L.active, k];
    const tg = game.room.ballTargets.find((t) => t.tree); for (let j = 0; j < 6 && !tg.done; j++) { const a = j * 1.05; P.go(tg.x - Math.sin(a) * 4, tg.z - Math.cos(a) * 4, { tol: 0.8, run: true, maxT: 60 }); P.settle(); P.throwAt(tg.x, tg.z); P.settle(); }
    return [...st, !!f.c6_bridge];
  }), (v) => v[0] === 'pass' && v[1] === 1 && v[2] && v[3] && v[4] >= 3 && v[5]);
  await browser.close();
  await start('base-09-trip1');
  is('C9 a save from before, chapter 6 between the trips: loads; the line\'s steps count as done (no thread, no kicks, no brake asked for); the mites, then the old trip at one press', await ev(() => {
    const f = game.flags, T = game.story._ps, M = game.regions.built('hamalayi'), L = M.line;
    const st = [f.chapterKey, !!f.c6_trip1, !!f.ps_v, T.on6, L.active];
    P.fight({ maxT: 120 }); P.settle();
    const w = M.lift.winch; P.use(w.x, w.z, { kind: 'c6winch' }); for (let i = 0; i < 400 && !f.c6_trip2; i++) { game.step(0.1); if (game.state !== 'play') P.settle(); }
    return [...st, !!f.c6_trip2, !!T.boarded, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'pass' && v[1] && !v[2] && !v[3] && v[4] === false && v[5] && !v[6] && !/brake|kicks/i.test(v[7]));
  is('C9 and it goes on: up, and the monastery ends the chapter without a brake', await ev(() => {
    const f = game.flags, M = game.regions.built('hamalayi'), p = M.lift.pad; P.go(p.x, p.z, { tol: 0.6 }); for (let i = 0; i < 400 && !f.c6_up; i++) game.step(0.1); P.settle();
    const Y = M.monastery.yard; P.go(Y.x, Y.z, { tol: 2, maxT: 200 }); P.settle(60); P.settle(30);
    return [!!f.c6_up, !!f.ps_safe, f.chapterKey];
  }), (v) => v[0] && !v[1] && v[2] === 'observatory');
  await browser.close();
  await start('base-10');
  is('C10 a save from before, chapter 7 at the monastery: loads; the telescope is ahead of it, so the thread is on (the line kicking outside)', await ev(() => {
    const f = game.flags, T = game.story._ps, L = game.regions.built('hamalayi').line;
    for (let i = 0; i < 20; i++) game.step(0.05);
    return [f.chapterKey, f.ob_v, T.on7, L.active, !!f.c7_scope];
  }), (v) => v[0] === 'observatory' && v[1] === 1 && v[2] && v[3] && !v[4]);
  await browser.close();
  await start('base-10-scope');
  is('C11 a save from before, chapter 7 with the telescope turned: loads; the fourth setting counts as done (no thread); the drone is next', await ev(() => {
    const f = game.flags, T = game.story._ps;
    return [f.chapterKey, !!f.c7_scope, !!f.ob_v, T.on7, document.querySelector('#objective').textContent, game.story.cur.journal().some((l) => l.key === 'ob_j_dir')];
  }), (v) => v[0] === 'observatory' && v[1] && !v[2] && !v[3] && /drone/i.test(v[4]) && !v[5]);
  await browser.close();
}

// ------------------------------------------------------------------ D: chapter 4, the bore test (CAMPAIGN-4)
// (a kick counter on the stand's ground needle, and the stand's own state, read the same way each time)
const STAND = () => ev(() => { const S = game.regions.built('desert').stand; if (!S._k) { S._k = 0; const k0 = S.kick; S.kick = () => { S._k++; k0(); }; } return true; });
const kicks = () => ev(() => game.regions.built('desert').stand._k);
if (!ONLY || ONLY === 'D') {
  await start('new-07-notebook');
  is('D0 the save: chapter 4, the notebook just taken in the storm, inside the post; the thread on, the drill turning, Dallan at the stand\'s wire, the objective still the dig', await ev(() => {
    const f = game.flags, T = game.story._dt, S = game.regions.built('desert').stand, n = P.npc('dallan');
    return [f.chapterKey, !!f.c4_notebook, T.on, T.open4, S.spinning, +Math.hypot(n.pos.x - S.spots.dallan.x, n.pos.z - S.spots.dallan.z).toFixed(1), !!f.dt_hail, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'dig' && v[1] && v[2] && v[3] && v[4] && v[5] < 1.5 && !v[6] && /dig/i.test(v[7]));
  await STAND();
  is('D1 out of the gate: Dallan takes him for the new hand ("he\'s with me": the post\'s watch calm), the objective is the test', await ev(() => {
    const f = game.flags, Post = game.rooms.desert.post; P.go(Post.gate.x - 6, Post.gate.z + 3, { tol: 1.5, run: true, stopWhen: () => f.dt_hail }); const sp = game.state; P.settle();
    return [!!f.dt_hail, sp, game.enemies.filter((e) => e.def.group === 'dpost').every((e) => e.def.calm()), game.story.objective().replace(/<[^>]+>/g, ' ')];
  }), (v) => v[0] && v[1] === 'dialog' && v[2] && /cutoff/i.test(v[3]));
  await shot('D1-hail');
  is('D2 the cutoff pulled on the red: the drill winds down, its needle falls, and after the stop the ground needle kicks three, rests, three', await ev(() => {
    const S = game.regions.built('desert').stand, f = game.flags, p = S.cut.touch();
    P.use(p.x, p.z, { near: 0.9, kind: 'dt_cut' }); for (let i = 0; i < 80 && !f.dt_second; i++) { game.step(0.25); P.settle(); }
    return [!!f.dt_cut, !!f.dt_second, S._k, S.spinning, +S.load.toFixed(2), S.cut.on];
  }), (v) => v[0] && v[1] && v[2] === 6 && v[3] === false && v[4] === 0 && v[5] === false);
  await shot('D2-first-cut');
  // a save between the two cut-offs
  await handover();
  is('D3 Save & quit → Continue between the two cuts: the drill stopped, the lever at CUT, the paper with one run, Dallan at the wire, the watch still calm, the objective to run it again', await ev(() => {
    const S = game.regions.built('desert').stand, f = game.flags, n = P.npc('dallan');
    return [!!f.dt_second, !!f.dt_again, S.spinning, S.cut.on, +Math.hypot(n.pos.x - S.spots.dallan.x, n.pos.z - S.spots.dallan.z).toFixed(1), game.enemies.filter((e) => e.def.group === 'dpost').every((e) => e.def.calm()), game.story.objective().replace(/<[^>]+>/g, ' ')];
  }), (v) => v[0] && !v[1] && v[2] === false && v[3] === false && v[4] < 1.5 && v[5] && /again/i.test(v[6]));
  await STAND();
  is('D4 leaving mid-task: the dig\'s keypad is dark while the test is on (its tag says why); the barrier stays down', await ev(() => {
    const g = game.rooms.desert.dig.gate; const r = P.use(g.x, g.z, { run: true, kind: 'c4gate' });
    return [r.r, game.state, !!game.flags.c4_digOpen, !!game.flags.dt_dark];
  }), (v) => v[1] === 'play' && v[2] === false && v[3]);
  is('D5 a failure: lever up and cut at once, before the bit is down: no kick after the stop; Dallan: too soon (a quick retry)', await ev(() => {
    const S = game.regions.built('desert').stand, f = game.flags; S._k = 0;
    let p = S.cut.touch(); P.use(p.x, p.z, { near: 0.9, kind: 'dt_cut' }); const up = S.spinning;
    p = S.cut.touch(); P.use(p.x, p.z, { near: 0.9, kind: 'dt_cut' }); const load = +S.load.toFixed(2);
    for (let i = 0; i < 30 && !f.dt_early; i++) { game.step(0.25); P.settle(); }
    return [up, load < 0.9, S._k, f.dt_early || 0, !!f.dt_again];
  }), (v) => v[0] && v[1] && v[2] === 0 && v[3] === 1 && !v[4]);
  is('D6 again, done right: lever up, the needle climbs to the red, cut: the same three and a rest after the stop', await ev(() => {
    const S = game.regions.built('desert').stand, f = game.flags; S._k = 0;
    let p = S.cut.touch(); P.use(p.x, p.z, { near: 0.9, kind: 'dt_cut' });
    let t = 0; while (S.load < 0.97 && t < 15) { game.step(0.25); t += 0.25; }
    p = S.cut.touch(); P.use(p.x, p.z, { near: 0.9, kind: 'dt_cut' }); for (let i = 0; i < 80 && !f.dt_again; i++) { game.step(0.25); P.settle(); }
    return [t, S._k, !!f.dt_again];
  }), (v) => v[0] > 3 && v[1] === 6 && v[2]);
  is('D7 the carbon torn off (the item, two traces); Dallan goes back in, the watch is the post\'s again, the keypad lights: the notebook\'s code opens the dig', await ev(() => {
    const S = game.regions.built('desert').stand, f = game.flags;
    P.use(S.strip.x, S.strip.z, { near: 0.9, kind: 'dt_strip' }); for (let i = 0; i < 40 && !f.dt_strip; i++) { game.step(0.25); P.settle(); }
    const item = game.story.items().some((i) => i.id === 'tstrip'), calm = game.enemies.filter((e) => e.def.group === 'dpost').some((e) => e.def.calm());
    P.settle(); for (let i = 0; i < 60; i++) { game.step(0.25); if (game.state !== 'play') P.settle(); }   // (the carbon's little ceremony first)
    const n = P.npc('dallan'), away = +Math.hypot(n.pos.x - S.spots.dallan.x, n.pos.z - S.spots.dallan.z).toFixed(1);
    const g = game.rooms.desert.dig.gate; P.use(g.x, g.z, { run: true, kind: 'c4gate' }); const m = P.menuPick(1); P.wait(1); P.settle();
    return [!!f.dt_strip, item, calm, away, !!f.c4_digOpen];
  }), (v) => v[0] && v[1] && !v[2] && v[3] > 2 && v[4]);
  await shot('D7-carbon');
  await handover();
  is('D8 Save & quit → Continue after completion: the drill still stopped, the paper torn, the carbon kept, the gate open, the journal has the test', await ev(() => {
    const S = game.regions.built('desert').stand, f = game.flags;
    return [S.spinning, S.cut.on, game.story.items().some((i) => i.id === 'tstrip'), !!f.c4_digOpen, game.story.cur.journal().some((l) => l.key === 'dt_j_test')];
  }), (v) => v[0] === false && v[1] === false && v[2] && v[3] && v[4]);
  await browser.close();
}

// ------------------------------------------------------------------ E: chapter 5, the heat line and the log (CAMPAIGN-4)
if (!ONLY || ONLY === 'E') {
  await start('new-08-routed');
  is('E0 the save: chapter 5, FunFrock\'s valves set; the thread on, Dallan at the stand, the pump\'s drive cold, nothing sent', await ev(() => {
    const f = game.flags, T = game.story._dt, D = game.regions.built('desert'), S = D.stand, n = P.npc('dallan');
    return [f.chapterKey, !!f.c5_routed, T.on, T.open5, +Math.hypot(n.pos.x - S.spots.dallan.x, n.pos.z - S.spots.dallan.z).toFixed(1), D.pump.drive.hot, !!f.dt_sent];
  }), (v) => v[0] === 'steam' && v[1] && v[2] && v[3] && v[4] < 1.5 && v[5] === false && v[6] === false);
  is('E1 back at the post: Vesk on the wire (Kesh keeps its water); the objective is the heat line, its star on the stand', await ev(() => {
    const f = game.flags, S = game.regions.built('desert').stand; if (game.room?.id !== 'desert') { const e = game.room?.exits?.find((x) => x.to === 'cond-out'); if (e) P.through(e.x, e.z); }
    P.go(S.board.x - 1.5, S.board.z, { tol: 1.0, run: true, stopWhen: () => f.dt_wire }); P.settle();
    return [!!f.dt_wire, game.story.objective().replace(/<[^>]+>/g, ' '), game.story.cur.markers().length];
  }), (v) => v[0] && /heat line/i.test(v[1]) && v[2] === 1);
  await handover();
  is('E2 Save & quit → Continue mid-task: the wire heard, the heat line still to throw, Dallan at the stand; he says so', await ev(() => {
    const f = game.flags, r = P.talk('dallan', { run: true });
    return [!!f.dt_wire, !!f.dt_divert, r.lines, game.story.objective().replace(/<[^>]+>/g, ' ')];
  }), (v) => v[0] && !v[1] && v[2] >= 1 && /heat line/i.test(v[3]));
  is('E3 the heat line thrown over to KESH: the pump\'s drive is hot; Vesk asks for test 14, drill channel only; the teleprinter sends it (the tape out, SENT lit)', await ev(() => {
    const f = game.flags, D = game.regions.built('desert'), S = D.stand, p = S.heat.touch();
    P.use(p.x, p.z, { near: 0.9, kind: 'dt_heat' }); for (let i = 0; i < 60 && !f.dt_sent; i++) { game.step(0.25); P.settle(); }
    return [!!f.dt_divert, S.heat.on, D.pump.drive.hot, !!f.dt_sent, game.story.objective().replace(/<[^>]+>/g, ' ')];
  }), (v) => v[0] && v[1] && v[2] && v[3] && /read/i.test(v[4]));
  await shot('E3-sent');
  is('E4 Dallan before the tape is read: it has gone to Citadel; no leave for the relief valve yet', await ev(() => { const r = P.talk('dallan', { run: true }); return [r.lines, !!game.flags.c5_dallanOK]; }), (v) => v[0] >= 1 && !v[1]);
  is('E5 the tape read (one trace; his carbon has two); put to Dallan: he looks the other way (the relief valve is his to open)', await ev(() => {
    const f = game.flags, S = game.regions.built('desert').stand;
    P.use(S.board.x, S.board.z, { near: 1.0, kind: 'dt_board' }); const log = !!f.dt_log;
    const r = P.talk('dallan', { run: true });
    return [log, r.lines, !!f.c5_dallanOK, game.rooms.desert.post.gate.isOpen, game.story.cur.journal().some((l) => l.key === 'dt_j_log')];
  }), (v) => v[0] && v[1] >= 7 && v[2] && v[3] && v[4]);
  await handover();
  is('E6 Save & quit → Continue after completion: the heat line at KESH, the drive hot, the tape out, the gate open, the carbon still kept', await ev(() => {
    const f = game.flags, D = game.regions.built('desert'), S = D.stand;
    return [S.heat.on, D.pump.drive.hot, !!f.dt_sent, D.post.gate.isOpen, game.story.items().some((i) => i.id === 'tstrip')];
  }), (v) => v.every((x) => x === true));
  await browser.close();
}

// ------------------------------------------------------------------ F: chapter 6, the line (CAMPAIGN-5)
// (the crank, by input: walk to where the hand meets its grip, wait for the gauge's needle in the green — or, for the
// failure, in the amber — and press E there)
const CRANK = (when) => ev((when) => {
  const G = game, f = G.flags, L = G.regions.built('hamalayi').line, Th = G.story._ps, lift = G.rooms.hamalayi.lift, p = L.crank.touch();
  P.go(p.front.x, p.front.z, { tol: 0.3 }); P.face(p.x, p.z);
  const ok = when === 'green' ? () => L.green() && L.phase() < L.surge + 0.7 : () => L.phase() > L.greenEnd + 0.8 && L.phase() < L.greenEnd + 1.6;
  let t = 0; while (!ok() && t < 15) { G.step(0.05); t += 0.05; }
  const ph = +L.phase().toFixed(2), tg = P.target()?.kind; P.tap('KeyE', 0.1);
  let top = 0; for (let i = 0; i < 900 && (Th.run || Th.busy || G.state !== 'play'); i++) { G.step(0.05); top = Math.max(top, lift.y - lift.y0); if (G.state === 'dialog') P.settle(); }
  P.settle();
  return { ph, tg, top: +top.toFixed(1), miss: f.ps_miss || 0, trip1: !!f.c6_trip1, trip2: !!f.c6_trip2 };
}, when);
const BOARD = () => ev(() => { const G = game, L = G.regions.built('hamalayi').line, Th = G.story._ps, p = L.crank.touch(); const r = P.use(p.front.x, p.front.z, { kind: 'ps_winch', near: 0.6 }); for (let i = 0; i < 200 && (G.trans || Th.busy || G.state !== 'play'); i++) { G.step(0.05); if (G.state === 'dialog') P.settle(); } return { lines: r.lines, boarded: Th.boarded, read: !!G.flags.ps_read }; });
if (!ONLY || ONLY === 'F') {
  await start('new-09-lift');
  is('F0 the save: chapter 6, the rope just cut; the thread on, the line kicking, the objective the first trip between the kicks', await ev(() => {
    const f = game.flags, T = game.story._ps, L = game.regions.built('hamalayi').line; for (let i = 0; i < 20; i++) game.step(0.05);
    return [f.chapterKey, !!f.c6_rope, T.on6, T.open6, L.active, !!f.ps_read, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'pass' && v[1] && v[2] && v[3] && v[4] && !v[5] && /between the kicks/i.test(v[6]));
  is('F1 the riders board (E at the winch); a kick comes as they stand there and he reads it on the gauge', await BOARD(), (v) => v.boarded === 1 && v.read && v.lines >= 6);
  await shot('F1-boarded');
  await handover();
  is('F2 Save & quit → Continue with the riders on the platform: they are back at their places (nothing lost), the line read stays read', await ev(() => {
    const f = game.flags, T = game.story._ps, n = P.npc('lhar1'), pad = game.rooms.hamalayi.lift.pad; const away = +Math.hypot(n.pos.x - pad.x, n.pos.z - pad.z).toFixed(1);
    return [T.boarded, !!f.ps_read, away, !!f.c6_trip1];
  }), (v) => v[0] === 0 && v[1] && v[2] > 3 && !v[3]);
  is('F2 boarded again: one line, no second reading', await BOARD(), (v) => v.boarded === 1 && v.lines <= 2);
  is('F3 a start too late (the needle in the amber): the next kick stops the winch part way up and the platform runs back down with them; said once', await CRANK('amber'), (v) => v.tg === 'ps_winch' && v.miss === 1 && !v.trip1 && v.top > 0.5);
  is('F3 the riders are still on the platform at the foot, the crank his again', await ev(() => { const T = game.story._ps, lift = game.rooms.hamalayi.lift, n = P.npc('lhar2'); return [T.boarded, +(lift.y - lift.y0).toFixed(2), +Math.hypot(n.pos.x - lift.pad.x, n.pos.z - lift.pad.z).toFixed(1)]; }), (v) => v[0] === 1 && Math.abs(v[1]) < 0.05 && v[2] < 1.5);
  is('F4 the retry in the green: the first trip is up; the ice mites', await CRANK('green'), (v) => v.trip1 && v.miss === 1);
  await shot('F4-trip1');
  is('F5 the mites driven off; the second trip boarded and cranked in the green', await ev(() => { P.fight({ maxT: 120 }); P.settle(); return true; }).then(() => BOARD()).then(() => CRANK('green')), (v) => v.trip2);
  await handover();
  is('F5 Save & quit → Continue after the second trip: Yorna at the top crank, the platform at the foot for him, the line still kicking', await ev(() => {
    const f = game.flags, M = game.regions.built('hamalayi'), n = P.npc('yorna'), c = M.lift.crank; for (let i = 0; i < 20; i++) game.step(0.05);
    return [!!f.c6_trip2, !!f.c6_up, +Math.hypot(n.pos.x - c.x, n.pos.z - c.z).toFixed(1), M.line.active, +(M.lift.y - M.lift.y0).toFixed(2)];
  }), (v) => v[0] && !v[1] && v[2] < 1.5 && v[3] && Math.abs(v[4]) < 0.1);
  await browser.close();
  await start('new-09-top');
  is('F6 the save: up the cliff, the brake not locked; Yorna at the crank; the objective the brake; the monastery does not end the chapter', await ev(() => {
    const f = game.flags, M = game.regions.built('hamalayi'), n = P.npc('yorna'), c = M.lift.crank, obj = document.querySelector('#objective').textContent;
    const Y = M.monastery.yard; P.go(Y.x, Y.z, { tol: 2, maxT: 120 }); P.settle(); for (let i = 0; i < 40; i++) game.step(0.05);
    return [!!f.c6_up, !!f.ps_safe, +Math.hypot(n.pos.x - c.x, n.pos.z - c.z).toFixed(1), obj, !!f.c6_done, f.chapterKey];
  }), (v) => v[0] && !v[1] && v[2] < 1.5 && /brake/i.test(v[3]) && !v[4] && v[5] === 'pass');
  is('F7 the upper brake locked (by hand): the platform goes down and comes up with Tam and Bodo through a kick, and holds', await ev(() => {
    const G = game, f = G.flags, L = G.regions.built('hamalayi').line, Th = G.story._ps, b = L.brake.touch();
    P.use(b.front.x, b.front.z, { kind: 'ps_brake', near: 0.6 }); for (let i = 0; i < 900 && (Th.busy || Th.run || G.state !== 'play'); i++) { G.step(0.05); if (G.state === 'dialog') P.settle(); } P.settle();
    const ph = (id) => P.npc(id)?.phaseKey; return { safe: !!f.ps_safe, on: L.brake.on, held: !!Th.restHeld, tam: ph('lh_tam'), bodo: ph('lh_grum'), obj: document.querySelector('#objective').textContent };
  }), (v) => v.safe && v.on && v.held && v.tam === 'mon' && v.bodo === 'mon' && /monastery/i.test(v.obj));
  await shot('F7-brake');
  await handover();
  is('F8 Save & quit → Continue after completion: the brake shown locked, Tam and Bodo at the camp, Yorna gone to the yard, the objective the monastery; it ends the chapter', await ev(() => {
    const G = game, f = G.flags, M = G.regions.built('hamalayi'), n = P.npc('yorna'), c = M.lift.crank; for (let i = 0; i < 20; i++) G.step(0.05);
    const st = [M.line.brake.on, P.npc('lh_tam')?.phaseKey, +Math.hypot(n.pos.x - c.x, n.pos.z - c.z).toFixed(1), document.querySelector('#objective').textContent];
    const Y = M.monastery.yard; P.go(Y.x, Y.z, { tol: 2, maxT: 200 }); P.settle(60); P.settle(30);
    return [...st, f.chapterKey];
  }), (v) => v[0] === true && v[1] === 'mon' && v[2] > 3 && /monastery/i.test(v[3]) && v[4] === 'observatory');
  await browser.close();
}

// ------------------------------------------------------------------ G: chapter 7, the fourth setting (CAMPAIGN-5)
if (!ONLY || ONLY === 'G') {
  await start('new-10-lit');
  is('G0 the save: chapter 7, the crystal lit; the thread on; the objective the fourth setting; the glacier turn not offered', await ev(() => {
    const f = game.flags, T = game.story._ps, O = game.regions.built('obsv');
    if (game.room?.id !== 'obsv') { const d = game.rooms.hamalayi.observatory.door; P.through(d.x, d.z); }
    P.go(O.telescope.x - 1.4, O.telescope.z - 0.2, { tol: 0.4 }); P.face(O.telescope.x, O.telescope.z);
    return [f.chapterKey, !!f.c7_sendell, T.on7, T.open7, document.querySelector('#objective').textContent, P.target()?.kind];
  }), (v) => v[0] === 'observatory' && v[1] && v[2] && v[3] && /fourth setting/i.test(v[4]) && v[5] !== 'c7scope');
  is('G1 the lever to four (by hand): the tube jerks in threes and stops pointing down', await ev(() => {
    const G = game, T = G.story._ps, Tl = G.rooms.obsv.telescope, p = Tl.lever.touch(); P.use(p.front.x, p.front.z, { kind: 'ob_set', near: 0.6 });
    for (let i = 0; i < 300 && (T.follow || T.busy || G.state !== 'play'); i++) { G.step(0.05); if (G.state === 'dialog') P.settle(); } P.settle();
    return [Tl.n, T.followed, !!G.flags.ob_follow, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 4 && v[1] && v[2] && /read/i.test(v[3]));
  await shot('G1-fourth');
  await handover();
  is('G2 Save & quit → Continue between the follow and the reading: the lever at four, the read still to do', await ev(() => {
    const T = game.story._ps, Tl = game.regions.built('obsv')?.telescope; return [game.room?.id, Tl?.n, T.followed, document.querySelector('#objective').textContent];
  }), (v) => v[1] === 4 && v[2] && /read/i.test(v[3]));
  is('G3 the ring read: Citadel; then setting three, the glacier (the dome turns, the vent\'s ice melts)', await ev(() => {
    const G = game, f = G.flags, said = []; const s0 = G.say.bind(G); G.say = (n, l, ...r) => { said.push([].concat(l).join(' ')); return s0(n, l, ...r); };
    if (G.room?.id !== 'obsv') { const d = G.rooms.hamalayi.observatory.door; P.through(d.x, d.z); }
    const O = G.rooms.obsv;
    P.use(O.telescope.ring.x, O.telescope.ring.z, { kind: 'ob_read', near: 0.8 }); P.settle();
    const dir = !!f.ob_dir; P.use(O.telescope.x, O.telescope.z, { kind: 'c7scope' }); P.settle(); G.say = s0;
    return [dir, said.some((l) => /CITADEL/.test(l)), !!f.c7_scope, O.telescope.n, document.querySelector('#objective').textContent];
  }), (v) => v[0] && v[1] && v[2] && v[3] === 3 && /drone/i.test(v[4]));
  await handover();
  is('G4 Save & quit → Continue after completion: the lever at three, the journal has the bearing, no prompt of the fourth setting', await ev(() => {
    const T = game.story._ps, Tl = game.regions.built('obsv')?.telescope; return [Tl?.n, game.story.cur.journal().some((l) => l.key === 'ob_j_dir'), T.open7];
  }), (v) => v[0] === 3 && v[1] && !v[2]);
  await browser.close();
}
// ------------------------------------------------------------------ H: the saves from before wave 4 (CAMPAIGN-6)
if (!ONLY || ONLY === 'H' || ONLY === 'C') {
  await start('base-11');
  is('C12 a save from before, chapter 8 at its start: loads; the lane is ahead, so the thread is on; the arrival plays: the list cart comes down to the shut gate, every seat empty, and turns away', await ev(() => {
    const G = game, f = G.flags, L = G.world.laneGate, T = G.story._ev; let seenCart = false, riders = 0, stopped = false;
    for (let i = 0; i < 400 && !(f.ev_cart && G.state === 'play' && !T.scene); i++) {
      if (T.scene?.kind === 'pass') { seenCart ||= L.cart.group.visible; riders = Math.max(riders, T.scene.seated?.size || 0); stopped ||= T.scene.wait > 0.5; }
      if (G.state === 'dialog') P.settle(); else G.step(0.05);
    }
    return [f.chapterKey, f.ev_v, seenCart, riders, stopped, !!f.ev_cart, L.gate.open, L.culvert.full, G.state, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'evacuation' && v[1] === 1 && v[2] && v[3] === 0 && v[4] && v[5] && v[6] === false && v[7] === true && v[8] === 'play' && /home/i.test(v[9]));
  is('C12 it goes on: home, Zoé hears of the cart (the gate shut since the water office closed)', await ev(() => {
    P.enter('house', { run: true }); const r = P.talk('zoe'); return [r.lines, !!game.flags.c8_home, game.story.cur.journal().some((l) => l.key === 'ev_j_cart')];
  }), (v) => v[0] >= 16 && v[1] && v[2]);
  await browser.close();
  await start('base-11-town');
  is('C13 a save from before, chapter 8 with the town in its shelters: loads; the thread is on, the arrival counts as seen (he has been home); Hedda and Tobin wait at their door, the gate shut', await ev(() => {
    const G = game, f = G.flags, L = G.world.laneGate, T = G.story._ev; for (let i = 0; i < 40; i++) G.step(0.05);
    const h = P.npc('ev_hedda'); return [f.ev_v, !!f.ev_cart, !!T.scene, h?.present, L.gate.open, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 1 && v[1] && !v[2] && v[3] && v[4] === false && /Zo/.test(v[5]));
  is('C13 it goes on: Zoé starts her run', await ev(() => { const r = P.talk('zoe', { run: true }); P.wait(1); P.settle(); return [!!game.flags.c8_zoeStart, game.hero.body]; }), (v) => v[0] && v[1] === 'zoe');
  await browser.close();
  await start('base-11-relay');
  is('C14 a save from before, chapter 8 with Zoé\'s run behind it: loads; the lane counts as done (no thread, the gate open, no board); the control room is next and Vesk speaks there', await ev(() => {
    const G = game, f = G.flags, L = G.world.laneGate; const st = [!!f.ev_v, L.gate.open, L.board.group.visible, document.querySelector('#objective').textContent];
    P.enter('control', { run: true }); P.wait(0.5); P.settle(); return [...st, !!f.c8_vesk];
  }), (v) => !v[0] && v[1] === true && v[2] === false && /control/i.test(v[3]) && v[4]);
  await browser.close();
}

// ------------------------------------------------------------------ I: chapter 8, the lane (CAMPAIGN-6)
// (Zoé's run from the start to the relay, by input, as the playthrough plays it)
const ZOERUN = () => ev(() => {
  const G = game; P.talk('zoe', { run: true }); P.wait(1); P.settle();
  for (const id of ['farmer1', 'farmer2', 'farmer3']) { P.talk(id, { run: true }); P.wait(1); P.settle(); }
  const Gp = G.story.cur.gather; P.go(Gp.x, Gp.z + 1, { tol: 2, run: true, maxT: 200 }); let t = 0; while (!G.flags.c8_relay && t < 20) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } P.settle();
  return { relay: !!G.flags.c8_relay, body: G.hero.body, farms: G.story.cur.farmsDone() };
});
const READ = (which) => ev((which) => { const B = game.world.laneGate.board, s = B[which]; const r = P.use(s.front.x, s.front.z, { near: 0.3, kind: which === 'sched' ? 'ev_sched' : 'ev_route' }); P.settle(); return { r: r.r, s: !!game.flags.ev_s, r2: !!game.flags.ev_r, sched: !!game.flags.ev_sched }; }, which);
const COCK = (when) => ev((when) => {
  const G = game, f = G.flags, h = G.hero, U = G.room.pump, c = U.culvert;
  P.go(c.front.x, c.front.z, { tol: 0.1 }); P.face(c.x, c.z); for (let i = 0; i < 20 && (h.steer || h.actT > 0); i++) G.step(0.05);   // (at his spot, facing it: E then plays the hand at once)
  // (the hand meets the handle ~0.5 s after E: pressed just before a kick lands it in the kick; just after the kicks, in the rest)
  const want = when === 'kick' ? [0.05, 0.25] : [0.95, 1.15];
  let t = 0; while (!(U.phase() > want[0] && U.phase() < want[1]) && t < 4) { G.step(1 / 60); t += 1 / 60; }
  const ph = +U.phase().toFixed(2), tg = P.target()?.kind; P.tap('KeyE', 0.05);
  for (let i = 0; i < 120 && (h.actT > 0 || h.steer || G.state !== 'play' || G.story._ev.busy); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  P.settle();
  return { ph, tg, kicks: f.ev_kick || 0, gate: !!f.ev_gate, open: c.open, outside: G.world.laneGate.gate.open };
}, when);
if (!ONLY || ONLY === 'I') {
  await start('new-11-town');
  is('I0 the save: chapter 8, the shelters open, Zoé\'s run ahead; the lane\'s gate shut, the culvert full, the board up on the lighthouse path', await ev(() => {
    const f = game.flags, L = game.world.laneGate; return [f.chapterKey, f.ev_v, !!f.ev_cart, L.gate.open, L.culvert.full, L.board.group.visible, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'evacuation' && v[1] === 1 && v[2] && v[3] === false && v[4] && v[5] && /Zo/.test(v[6]));
  is('I1 Zoé\'s run to the relay: she stays on, and the board is next', await ZOERUN(), (v) => v.relay && v.body === 'zoe' && v.farms === 3);
  is('I1 the route read first (one of two): the objective keeps the schedule', await READ('route'), (v) => v.r2 && !v.s && !v.sched);
  await shot('I1-board');
  await handover();
  is('I2 Save & quit → Continue half way through the board: her run resumes before it (as every save in her run): Twinsen, the farms and the board to do again, nothing of the lane kept', await ev(() => {
    const f = game.flags; return [game.hero.body, !!f.c8_zoeStart, !!f.c8_relay, !!f.ev_r, game.story.cur.farmsDone(), document.querySelector('#objective').textContent];
  }), (v) => v[0] !== 'zoe' && !v[1] && !v[2] && !v[3] && v[4] === 0 && /Zo/.test(v[5]));
  is('I3 the run again; the schedule and the route read: the lane is on one and crossed off the other', await ZOERUN().then(() => READ('sched')).then(() => READ('route')), (v) => v.s && v.r2 && v.sched);
  is('I3 Bram, then Hedda and Tobin told; they walk to the landing; Zoé there: back to Twinsen, Bram on the float gate', await ev(() => {
    const G = game, f = G.flags, L = G.world.laneGate; P.talk('bram', { run: true }); P.talk('ev_hedda', { run: true });
    P.go(L.landing.x + 1.6, L.landing.z + 0.4, { tol: 1.2, run: true, maxT: 120 });
    let t = 0; while (!(f.c8_zoeDone && G.hero.body === 'twinsen' && G.state === 'play' && !G.trans) && t < 60) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } P.settle();
    const d = (id) => +Math.hypot(P.npc(id).pos.x - L.landing.x, P.npc(id).pos.z - L.landing.z).toFixed(1);
    return [!!f.ev_bram, !!f.ev_hedda, !!f.c8_zoeDone, G.hero.body, d('bram'), d('ev_hedda'), d('ev_tobin'), d('pippa'), document.querySelector('#objective').textContent];
  }), (v) => v[0] && v[1] && v[2] && v[3] === 'twinsen' && v[4] < 2.5 && v[5] < 2.5 && v[6] < 2.5 && v[7] < 2.5 && /water gate/i.test(v[8]));
  await shot('I3-landing');
  await browser.close();
  await start('new-11-landing');
  is('I4 the save: Twinsen at the landing; the gate shut; Bram waits (his line); into the pump room: the copper pipe kicks, the grate brims; the culvert\'s pipe looked at', await ev(() => {
    const G = game, f = G.flags; const b = P.talk('bram', { run: true });
    const K = G.world.pumpKiosk; P.through(K.door.x, K.door.z); P.settle(); const U = G.room?.pump; if (!U) return ['no room'];
    const r = P.use(U.culvert.x, U.culvert.z, { near: 0.9, kind: 'ev_culvert' }); P.settle();
    return [b.r, G.room.id, !!f.ev_in, U.surge, U.culvert.full, U.culvert.open, !!f.ev_seen, G.world.laneGate.gate.open];
  }), (v) => v[0] === 'talked' && v[1] === 'pumproom' && v[2] && v[3] && v[4] && !v[5] && v[6] && v[7] === false);
  await shot('I4-room');
  await handover();
  is('I5 Save & quit → Continue in the pump room: there, the sump full, the cock shut, the pipe kicking, the objective the cock', await ev(() => {
    const G = game, U = G.room?.pump; return [G.room?.id, U?.culvert.full, U?.culvert.open, U?.surge, !!G.flags.ev_seen, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'pumproom' && v[1] && !v[2] && v[3] && v[4] && /water gate/i.test(v[5]));
  is('I6 turned in a kick: the copper pipe kicks the handle back; said once; nothing changes', await COCK('kick'), (v) => v.tg === 'ev_cock' && v.kicks === 1 && !v.gate && !v.open && v.outside === false);
  is('I6 turned in the rest: it opens; the culvert drains, and up on the lane the gate opens', await COCK('rest'), (v) => v.gate && v.open && v.outside === true);
  await shot('I6-open');
  await handover();
  is('I7 Save & quit → Continue after the cock, before the boarding: in the pump room, the cock open, the sump dry, the gate open outside; the objective the landing', await ev(() => {
    const G = game, U = G.room?.pump, L = G.world.laneGate; return [G.room?.id, U?.culvert.open, U?.culvert.full, L.gate.open, L.culvert.full, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'pumproom' && v[1] && !v[2] && v[3] && !v[4] && /landing/i.test(v[5]));
  is('I8 up the steps: the cart comes in through the gate, the lane boards (Bram, Hedda, Tobin, Pippa) and is driven off; Zoé goes back to the hill families', await ev(() => {
    const G = game, f = G.flags, T = G.story._ev; let t = 0, inLane = false, seated = 0;
    // (watched frame by frame through the scene's own pose: the bot's walk out plays the whole boarding as it settles)
    const pr = T.poseRiders; T.poseRiders = function (dt) { const S = T.scene; if (S) { seated = Math.max(seated, S.seated?.size || 0); if (G.world.laneGate.cart.z > 61) inLane = true; } return pr.call(T, dt); };
    P.exitTo('pump-out');
    while (!(f.ev_board && G.state === 'play') && t < 90) { if (G.state === 'dialog') P.settle(); else { G.step(0.1); t += 0.1; } }
    P.settle(); T.poseRiders = pr;
    return [!!f.ev_board, inLane, seated, G.world.laneGate.cart.group.visible, document.querySelector('#objective').textContent];
  }), (v) => v[0] && v[1] && v[2] === 4 && !v[3] && /control/i.test(v[4]));
  await shot('I8-boarded');
  await handover();
  is('I9 Save & quit → Continue after the boarding: the lane\'s people in the bridge\'s queue, the landing empty (no bundles), the gate open, Zoé back at the lighthouse; Bram on the bridge has had worse days', await ev(() => {
    const G = game, f = G.flags, L = G.world.laneGate, B = G.world.spaceport.bridge, z = P.npc('zoe'), Gp = G.story.cur.gather;
    const d = (id) => +Math.hypot(P.npc(id).pos.x - B.x1, P.npc(id).pos.z - B.z).toFixed(1);
    const st = [d('bram'), d('ev_hedda'), d('ev_tobin'), L.landing.bundles.visible, L.gate.open, +Math.hypot(z.pos.x - Gp.x, z.pos.z - Gp.z).toFixed(1)];
    const r = P.talk('bram', { run: true }); return [...st, r.r, !!f.ev_board];
  }), (v) => v[0] < 9 && v[1] < 9 && v[2] < 9 && v[3] === false && v[4] === true && v[5] < 4 && v[6] === 'talked' && v[7]);
  is('I10 and the chapter goes on: the control room, Vesk on the screen', await ev(() => { P.enter('control', { run: true }); P.wait(0.5); P.settle(); return !!game.flags.c8_vesk; }), (v) => v === true);
  await browser.close();
}

// ------------------------------------------------------------------ J: the saves from before wave 5 (CAMPAIGN-7)
if (!ONLY || ONLY === 'J' || ONLY === 'C') {
  await start('base-12');
  is('C15 a save from before, chapter 9 at its start: loads; the stop is ahead, so the thread is on, nothing of it past; it goes on: Baldino and the petition', await ev(() => {
    const f = game.flags; const st = [f.chapterKey, f.cn_v, !!f.cn_closed, !!f.cn_kell, !!f.cn_log];
    const r = P.talk('baldino', { run: true }); return [...st, r.r, !!f.c9_form];
  }), (v) => v[0] === 'council' && v[1] === 1 && !v[2] && !v[3] && !v[4] && v[6]);
  await browser.close();
  await start('base-12-heard');
  is('C16 a save from before, after the hearing: loads; the thread is on; the order hangs by the archive\'s door, which refuses him with it read; the objective sends him to Kell', await ev(() => {
    const G = game, f = G.flags; const st = [f.cn_v, !!f.cn_closed];
    if (G.room?.id === 'council') P.exitTo('council-out');
    const shown = G.rooms.upper.order.shown;
    const r = P.exitTo('up-archive'); P.settle();
    return [...st, shown, G.room?.id, f.cn_closed, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 1 && !v[1] && v[2] && v[3] === 'upper' && v[4] === true && /Kell/.test(v[5]));
  await shot('C16-order');
  await browser.close();
  await start('base-12-plans');
  is('C17 a save from before, the plans in hand in the archive: loads; the gallery and the log count as done (the front door is his); back in the chamber the vote orders the stop and the chapter goes on, to the console', await ev(() => {
    const G = game, f = G.flags; const st = [f.cn_v, f.cn_kell, f.cn_log, G.room?.id];
    P.exitTo('archive-out'); P.exitTo('up-council'); P.settle(60); P.settle(30);
    return [...st, !!f.c9_vote, f.chapterKey, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 1 && v[1] === 'past' && v[2] === 'past' && v[3] === 'archive' && v[4] && v[5] === 'council' && /console/i.test(v[6]));
  await browser.close();
}

// ------------------------------------------------------------------ K: chapter 9's thread (CAMPAIGN-7)
if (!ONLY || ONLY === 'K') {
  await start('new-12-heard');
  is('K0 the save: chapter 9 after the hearing, in the chamber; the archive\'s door read: shut by the order; Kell asked: the deck comes down for them', await ev(() => {
    const G = game, f = G.flags; P.exitTo('council-out'); P.exitTo('up-archive'); P.settle(); const closed = f.cn_closed;
    P.exitTo('up-down'); const r = P.talk('zl_kell', { run: true }); for (let i = 0; i < 60 && G.story._cn.kell.busy; i++) G.step(0.1);
    const L = G.rooms.zeelich.lift; return [closed, r.r, !!f.cn_kellAsk, +(L.deckY - L.low).toFixed(2), document.querySelector('#objective').textContent];
  }), (v) => v[0] === true && v[1] === 'talked' && v[2] && v[3] === 0 && /Ride/i.test(v[4]));
  await handover();
  is('K1 Save & quit → Continue with the deck down for them: it is still down; the ride is there to take; up with Kell, he opens the service door', await ev(() => {
    const G = game, f = G.flags, L = G.rooms.zeelich.lift; const low = +(L.deckY - L.low).toFixed(2);
    const r = P.use(L.deck.x, L.deck.z, { near: 1.9, kind: 'cn_ride' }); for (let i = 0; i < 300 && !(f.cn_kell && G.state === 'play'); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    const k = P.npc('zl_kell'); return [low, r.target?.kind, f.cn_kell, +(G.hero.pos.y - L.top).toFixed(2), +Math.hypot(k.pos.x - L.service.x, k.pos.z - L.service.z).toFixed(1)];
  }), (v) => v[0] === 0 && v[1] === 'cn_ride' && v[2] === true && Math.abs(v[3]) < 0.2 && v[4] < 2.5);
  await shot('K1-door');
  await handover();
  is('K2 Save & quit → Continue at the service door: the door still open (Kell gone back to his brake); through it, the back gallery; out by the gallery\'s door mid-task, back on the terrace; and in again', await ev(() => {
    const G = game, f = G.flags, L = G.rooms.zeelich.lift; const k = P.npc('zl_kell');
    const kAt = +Math.hypot(k.pos.x - L.spots.kell.x, k.pos.z - L.spots.kell.z).toFixed(1);
    const go = () => { P.use(L.service.x, L.service.z, { near: 0.9, kind: 'cn_service' }); for (let i = 0; i < 60 && G.room?.id !== 'archive'; i++) { G.step(0.1); P.settle(); } P.settle(); return [G.room?.id, +G.hero.pos.y.toFixed(1)]; };
    const in1 = go(); const out = P.exitTo('archive-gallery'); P.settle(); const back = [G.room?.id, +(G.hero.pos.y - L.top).toFixed(1)]; const in2 = go();
    return [kAt, in1, out.to, back, in2, document.querySelector('#objective').textContent];
  }), (v) => v[0] < 1 && v[1][0] === 'archive' && v[1][1] > 2 && v[2] === 'zeelich' && v[3][0] === 'zeelich' && Math.abs(v[3][1]) < 0.3 && v[4][0] === 'archive' && /plans/i.test(v[5]));
  await shot('K2-gallery');
  await browser.close();
  await start('new-12-drawer');
  is('K3 the save: the BORE drawer open (the log, the order that cut it), the carbon still in his pocket; the archivist off his watch; the objective the comparison', await ev(() => {
    const G = game, f = G.flags; return [G.room?.id, !!f.cn_drawer, !!f.cn_log, G.rooms.archive.drawer.open, !!G.story.cur.watcher?.active, G.story.items().some((i) => i.id === 'tstrip'), document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'archive' && v[1] && !v[2] && v[3] && !v[4] && v[5] && /carbon/i.test(v[6]));
  is('K4 the carbon laid on the log: line for line; the plans in hand, the carbon handed on (out of his pocket); the chamber next', await ev(() => {
    const G = game, f = G.flags, D = G.rooms.archive.drawer; const r = P.use(D.x, D.z, { near: 0.6, kind: 'cn_compare' }); for (let i = 0; i < 80 && !f.cn_log; i++) { G.step(0.1); P.settle(); }
    return [r.target?.kind, f.cn_log, !!f.c9_plans, G.story.items().some((i) => i.id === 'tstrip'), document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'cn_compare' && v[1] === true && v[2] && !v[3] && /council/i.test(v[4]));
  await browser.close();
  await start('new-12-vote');
  is('K5 the save: the stop ordered; the guard stands aside (his line); the stop thrown at the console: the BORE needle down, the GROUND needle still kicking; Mill Lane dry (the cart half way, no water)', await ev(() => {
    const G = game, f = G.flags, S = G.rooms.zeelich.platform.stop, L = G.rooms.zeelich.lift; if (G.room?.id === 'council') P.exitTo('council-out'); if (G.room?.id === 'upper') P.exitTo('up-down'); const g = P.talk('guard', { run: true });
    const r = P.use(S.x, S.z, { kind: 'cn_stop', near: 0.8, run: true }); for (let i = 0; i < 200 && !(f.cn_stop && G.state === 'play' && !G.story._cn.busy); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    return [g.r, r.target?.kind, !!f.cn_stop, S.thrown, S.loose, +(L.deckY - L.y0).toFixed(2), L.cartK, !!L.state.water, document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'talked' && v[1] === 'cn_stop' && v[2] && v[3] && v[4] && v[5] > 1.5 && v[5] < 2.5 && v[6] === 0 && !v[7] && /bench/i.test(v[8]));
  await handover();
  is('K6 Save & quit → Continue with Mill Lane dry: still dry (the cart half way, Kell on his brake, Brel\'s empty jug); the console\'s stop still thrown', await ev(() => {
    const G = game, f = G.flags, L = G.rooms.zeelich.lift, S = G.rooms.zeelich.platform.stop; const b = P.talk('zl_brel', { run: true });
    return [!!f.cn_stop, +(L.deckY - L.y0).toFixed(2), !!L.state.water, P.npc('zl_kell').forceAnim, b.r, S.thrown];
  }), (v) => v[0] && v[1] > 1.5 && v[1] < 2.5 && !v[2] && v[3] === 'use' && v[4] === 'talked' && v[5]);
  await shot('K6-dry');
  await browser.close();
  await start('new-12-stop');
  is('K7 the save: after the stop; the bench: Baldino hands over the isolator; on the first relay it holds that one (the other jumps)', await ev(() => {
    const G = game, f = G.flags; P.enter('workshop', { run: true }); P.settle(); const T = G.rooms.workshop.life.terminals, S = G.rooms.workshop.life.state;
    const r = P.use(T.A.x, T.A.z, { kind: 'cn_iso', near: 0.6 }); for (let i = 0; i < 60 && !f.cn_isoA; i++) { G.step(0.1); P.settle(); }
    return [!!f.cn_isoGot, r.target?.kind, !!f.cn_isoA, S.loose, S.iso, !!f.cn_iso];
  }), (v) => v[0] && v[1] === 'cn_iso' && v[2] && v[3] && v[4] === 'A' && !v[5]);
  await handover();
  is('K8 Save & quit → Continue with one relay clipped: the bench still loose, the isolator still on the first relay; on the second: both tried, the isolator in his pocket; the objective Kell\'s feed', await ev(() => {
    const G = game, f = G.flags, T = G.rooms.workshop.life.terminals, S = G.rooms.workshop.life.state; for (let i = 0; i < 5; i++) G.step(0.1); const st = [G.room?.id, S.loose, S.iso];
    const r = P.use(T.B.x, T.B.z, { kind: 'cn_iso', near: 0.6 }); for (let i = 0; i < 80 && !f.cn_iso; i++) { G.step(0.1); P.settle(); }
    return [...st, r.target?.kind, !!f.cn_iso, G.story.items().some((i) => i.id === 'iso'), document.querySelector('#objective').textContent];
  }), (v) => v[0] === 'workshop' && v[1] && v[2] === 'A' && v[3] === 'cn_iso' && v[4] && v[5] && /feed/i.test(v[6]));
  is('K9 Mill Lane: the isolator on Kell\'s feed box: the deck rises, the standpipe runs; Baldino on the radio: a network → chapter 10', await ev(() => {
    const G = game, f = G.flags; P.enter('zeelich'); const L = G.rooms.zeelich.lift; const r = P.use(L.isoAt.x, L.isoAt.z, { kind: 'cn_clip', near: 0.6, run: true });
    let water = false; for (let i = 0; i < 300 && f.chapterKey === 'council'; i++) { G.step(0.1); water ||= !!L.state.water; if (G.state === 'dialog') P.settle(); }
    P.settle(60); P.settle(30); return [r.target?.kind, !!f.cn_lane, water, f.chapterKey];
  }), (v) => v[0] === 'cn_clip' && v[1] && v[2] && v[3] === 'network');
  await handover();
  is('K10 Save & quit → Continue in chapter 10, then Mill Lane: the lift up, the standpipe running, the isolator on the feed box; Brel checks his jug twice', await ev(() => {
    const G = game, f = G.flags; if (G.room?.id !== 'zeelich') P.enter('zeelich'); const L = G.rooms.zeelich.lift; P.settle();
    const b = P.talk('zl_brel', { run: true });
    return [f.chapterKey, +(L.deckY - L.y0).toFixed(2), !!L.state.water, L.isoShown(), b.r];
  }), (v) => v[0] === 'network' && v[1] > 3 && v[2] && v[3] && v[4] === 'talked');
  await shot('K10-lane');
  await browser.close();
}
done();
fs.rmSync(TMP, { recursive: true, force: true });
