// THE SECOND SHIFT (P109, docs/SECOND-SHIFT.md, "First build the Zeelich thread end to end"): Kell's lift in chapter 3,
// Brum comes downstairs in chapter 9, and the Core's radio exchange — against isolated saves (tests/fixtures/campaign/),
// by input (tests/lib/player.js: keys held and tapped, time stepped; nothing teleported, no flag set) unless a part says
// STAGED: a fixture save edited before it is loaded (a flag added, as a later build's save would carry it).
//   A  chapter 3 (new-05, by input from the landing): the lift's own repair to the water, then the lunch: Brel passes on
//      Mother Snuff's word as Twinsen comes by the lift; Kell lets the deck down and Brel wheels his barrow on; Save & quit
//      → Continue there; the handle taken, the deck raised until the cloth is at the nail (the player's view of it), let
//      go: level the first time — the wheel's sound, the barrow seen over the joint onto the terrace, Kell back with his
//      bread; Save & quit → Continue after it; Baldino still waits for Irsa's bench as before
//   B  a near miss and the correction (from A's save at the handle-ready step): past the nail, Brel's wheel catches the lip
//      (the barrow jolts back), "Down a touch!", nudged down from where it is (no restart); short of it, the second miss
//      names the cloth and the nail; then level
//   C  leaving mid-interaction: the handle taken, the deck half up, let go, walked off: Kell comes back with his bread and
//      waits by the lever; Save & quit with the handle in his hands → Continue: nothing in hand, the deck down for the
//      barrow, Kell back; the handle taken again (Kell has nothing more to say), level → Kell watched it
//   D  with every sound off: the trip by what is seen only (the cloth and the nail; a near miss shown by the barrow's jolt)
//   E  chapter 9 (new-12-stop: the stop thrown, Mill Lane dry; no lunch in this save: the optional scene skipped): Brum by
//      the dry tap; the bench's isolator; the clip: the motor runs, the deck down, Kell on it, Brum offers his hand; Brel's
//      tug and word while Twinsen keeps away; Save & quit → Continue in the lesson; the handle shown; Save & quit during
//      Brum's trip → Continue: his trip runs, the cloth to the nail, the cart's wheel over the joint, the water → chapter 10
//      (the expanded campaign: Borrowed Time). E2 the same save on the base campaign (STAGED exp_base) → the network
//      chapter on Zeelich: Mill Lane revisited — Brum at the handle, his coat on its peg clear of the cable, Kell by the cart
//   F  the Core (new-15-last): F1 the save as it is (no Brum scene): Irsa's line alone, as before; F2 STAGED cn_brum with
//      Vesk pulled clear and F3 STAGED cn_brum with Vesk left: the radio exchange in its order (Kell starts, Brum "Cloth to
//      the nail. I know.", Kell to the cart, the wheel's caption and sound, Irsa), Vesk's key, the bar after her two, two
//      knocks, Arthur, Zoé's signal, the guard: the epilogue
//   G  older saves already past chapter 9: base-13 (chapter 10, Mill Lane as before: Kell at his lever, no Brum, no coat);
//      STAGED new-12-stop with the lane already running and no Brum flags (a save made just before chapter 9's end on a
//      build before this): the chapter ends as it did, no lesson
// PART 2 (docs/lba-maturity/SECOND-SHIFT-PART2.md):
//   H  free play after the ending (STAGED: a 'home' save, new-15-last with the epilogue's flags): Brum at the handle, the
//      deck standing, Kell not on the lane; into Snuff's bakehouse by its door: Kell with his loaf, his one line, no banner;
//      Save & quit → Continue there; a free play without Brum's lesson: Kell at his lever as before
//   I  chapter 7 "The wrong roof" (base-10, by input): Sefa at his shutter, the old roof, Pim and the goats; Save & quit →
//      Continue at the shutter; taken, let go, taken again; swung until Tashi answers from the lift's top landing; into
//      the dome (no second greeting); Save & quit → Continue after; new-10-lit (Sefa met before): no scene
//   J  chapter 13 "A chair by the cradle" (STAGED: the families' decision made, by flags): Wenna brings the soup; Save &
//      quit → Continue; the chair carried to the cradle (by input), the two seated, the lid shut, no reward; out and back
//      in; Save & quit → Continue; Tessa ends the chapter; a base-campaign save holds nothing of Ballastra
// ONLY=A|B|C|D|V|E|F|G|H|I|J (several: ONLY=AB), SHOTS=<dir> writes the play camera's pictures (Follow, Far; 1280×720).
import { launch, open, menu, quitAndKeep, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const ORIGIN = new URL(process.env.GAME_URL || 'http://localhost:8123/').origin;
const ONLY = process.env.ONLY || 'ABCDVEFGHIJ', SHOTS = process.env.SHOTS;
const want = (k) => ONLY.includes(k);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'shift-'));
// a fixture's save for this run's origin (never the player's own storage: a fresh profile per launch), with flags added
const save = (name, add = null) => {
  const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8'));
  for (const o of j.origins || []) {
    o.origin = ORIGIN;
    if (add) for (const it of o.localStorage || []) if (it.name === 'lba3_save_v1') {
      const s = JSON.parse(it.value), { __exp, ...fl } = add; Object.assign(s.flags, fl); for (const k of Object.keys(fl)) if (fl[k] === undefined) delete s.flags[k];
      // (__exp: written as a format-6 save of the expanded campaign, the order of this build: a game that played the new chapters)
      if (__exp) { s.v = 6; s.order = ORDER6; s.flags.exp = 1; delete s.flags.exp_base; s.flags.chapter = ORDER6.indexOf(s.flags.chapterKey); }
      it.value = JSON.stringify(s);
    }
  }
  return j;
};
const ORDER6 = ['well', 'project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'evacuation', 'council', 'throttle', 'ballastra', 'balances', 'survey', 'network', 'shell', 'core', 'home'];   // (src/game/story/index.js ORDER)
const kept = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
let page, context, browser;
const ev = (f, a) => page.evaluate(f, a);
const W = 1280, H = 720;
// the page's helpers: what was played and said (recorded, never changed), the camera as a player starts it (Follow, Far)
const helpers = () => ev(() => {
  const G = game;
  window.SS = { snd: [], said: [] };
  const play = G.audio.play.bind(G.audio); G.audio.play = (n, ...a) => { SS.snd.push(n); return play(n, ...a); };
  const say = G.say.bind(G); G.say = (n, t, ...r) => { SS.said.push([n, String(Array.isArray(t) ? t.join(' ') : t)]); return say(n, t, ...r); };
  G.settings.camera = 'follow'; G.settings.camDist = 'far'; G.applySettings?.();
  // hold a key for a number of 1/30 s frames, or until(); returns the frames held
  SS.hold = (code, until, max = 600) => { const k = G.input.keys; k.add(code); let i = 0; for (; i < max && !until(); i++) G.step(1 / 30); k.delete(code); G.step(1 / 30); return i; };
  // wait in play (dialogue read with E, as a player does) until a condition, or max seconds
  SS.until = (cond, max = 60) => { let t = 0; for (; t < max && !cond(); t += 0.1) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } return +t.toFixed(1); };
  SS.lift = () => G.regions.built('zeelich').lift;
  SS.err = () => { const L = SS.lift(); return +(L.clothY() - L.nailY).toFixed(3); };   // (the cloth's height against the nail: what the player sees)
});
const start = async (name, add = null, file = null) => {
  ({ browser, context, page } = await launch({ width: W, height: H, storageState: file ? kept(file) : save(name, add) }));
  await open(page, '?nocine'); await menu(page, 'continue'); await helpers(); await ev(() => { P.settle(); });
};
const handover = async (keep = null) => {
  const f = keep || path.join(TMP, 'hand.json');
  await quitAndKeep(page, context, f); await open(page, '?nocine'); await menu(page, 'continue'); await helpers(); await ev(() => { P.settle(); });
};
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }).catch(() => {}); };
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
const READY = path.join(TMP, 'lunch-ready.json');
// READY_IN=<file>: a kept save from A's handle-ready step (A writes it; KEEP_READY=<file> keeps a copy) for B, C, D, V alone
if (process.env.READY_IN) fs.copyFileSync(process.env.READY_IN, READY);

// ------------------------------------------------------------------ the chapter-3 repair, by input (as campaign-thread B)
const repairToWater = () => ev(() => {
  const LT = game.story.cur.lift, L = LT.L, f = game.flags;
  P.talk('zl_brel', { run: true }); P.go(L.lane.x + 1.5, L.lane.z + 1.5, { tol: 1.0 }); game.step(0.5); P.settle(); P.talk('zl_kell');
  P.go(L.spots.stairFoot.x, L.spots.stairFoot.z, { tol: 0.6, maxT: 60 }); P.go(L.spots.stairTop.x, L.spots.stairTop.z, { tol: 0.7, maxT: 60 });
  P.use(L.hook.x, L.hook.z, { near: 1.0, kind: 'zt_hook' }); for (let i = 0; i < 60 && !f.zt_hook; i++) { game.step(0.25); P.settle(); }
  P.use(L.bell.x, L.bell.z, { near: 1.0, kind: 'zt_bell' }); for (let i = 0; i < 60 && !f.zt_bell; i++) { game.step(0.25); P.settle(); } P.settle();
  for (let i = 0; i < 80 && LT.brel; i++) game.step(0.25);
  P.go(L.feed.front.x, L.feed.front.z - 0.5, { tol: 0.8, maxT: 90 });
  P.use(L.feed.x, L.feed.z, { near: 1.0, kind: 'zt_feed' }); for (let i = 0; i < 80 && !(f.zt_feed && !LT.busy); i++) { game.step(0.25); P.settle(); }
  P.use(L.deck.x, L.deck.z, { near: 1.9, kind: 'zt_ride' }); for (let i = 0; i < 80 && !f.zt_ride; i++) { game.step(0.25); P.settle(); } P.settle();
  P.use(L.cart.x, L.cart.z, { near: 1.3, kind: 'zt_cart' }); for (let i = 0; i < 60 && !(f.zt_shove && !LT.busy); i++) { game.step(0.25); P.settle(); }
  P.use(L.cock.x, L.cock.z, { near: 1.3, kind: 'zt_cock' }); for (let i = 0; i < 80 && !f.zt_water; i++) { game.step(0.25); P.settle(); } P.settle();
  for (let i = 0; i < 200 && LT.brel; i++) game.step(0.25);
  return [!!f.zt_water, !!f.zt_kellThanks, !!f.zt_lunchCall];
});
// down the stair and along the lane toward Kell's lever: Brel's call comes as he nears it
const comeByTheLift = () => ev(() => {
  const LT = game.story.cur.lift, L = LT.L, f = game.flags, S = L.spots;
  P.go(S.stairFoot.x, S.stairFoot.z, { tol: 0.7, maxT: 60 });
  const r = P.go(S.kell.x + 2.2, S.kell.z + 1.6, { tol: 0.6, maxT: 60, stopWhen: () => game.state === 'dialog' });
  const t = SS.until(() => LT.lunchPh === 'ready', 90);
  const n = P.npc('zl_brel'), b = L.barrowAt();
  return { r: r.r, call: !!f.zt_lunchCall, ph: LT.lunchPh, t, deck: +(L.deckY - L.low).toFixed(2), barrow: [b.shown, +(b.y - L.low).toFixed(2), +Math.hypot(b.x - L.shift.barrowDeck.x, b.z - L.shift.barrowDeck.z).toFixed(2)],
    brel: [+(n.pos.y - L.low).toFixed(2), n.controlled], said: SS.said.map((s) => s[1]).filter((s) => /Snuff|handle|cloth/.test(s)) };
});
// to the handle and take it (E), until it is in his hands
const takeHandle = () => ev(() => {
  const LT = game.story.cur.lift, L = LT.L, h = game.hero;
  const r = P.use(L.handle.x, L.handle.z, { near: 1.0, kind: 'zt_handle' });
  const t = SS.until(() => !!LT.hold && game.heroHold, 20);
  game.step(0.8);   // (the prompt shows after its dwell; until then the box keeps its last words, hidden)
  return { r: r.r, hold: !!LT.hold, t, at: +Math.hypot(h.pos.x - L.handle.front.x, h.pos.z - L.handle.front.z).toFixed(2), facing: +h.angle.toFixed(2),
    toast: (game.hud.toastLog || []).slice(-2), prompt: document.querySelector('#prompt')?.textContent };
});
// Up held while he watches the cloth come down to the nail; let go there (the frames it took)
const raiseToNail = (aim = 0) => ev((aim) => SS.hold('ArrowUp', () => SS.err() <= aim + 0.012), aim);
const waitDone = () => ev(() => { const f = game.flags, LT = game.story.cur.lift; const t = SS.until(() => f.zt_lunch && !LT.walks.length, 60); return t; });

if (want('A')) {
  await start('new-05');
  is('A0 the save: chapter 3 at the landing, the lift stuck; no lunch flags, no barrow, no coat', await ev(() => {
    const f = game.flags, L = game.story.cur.lift.L; return [f.chapterKey, !!f.zt_lunchCall, L.barrowAt().shown, L.coatShown(), +(L.deckY - L.half).toFixed(2), +(L.clothY() - L.nailY).toFixed(2)];
  }), (v) => v[0] === 'zeelich' && !v[1] && !v[2] && !v[3] && v[4] === 0 && Math.abs(v[5] - 1.5) < 0.01);
  is('A1 the repair as before, by input: the water in, Kell has thanked him; the lunch has not come up on the terrace', await repairToWater(), (v) => v[0] && v[1] && !v[2]);
  const call = is("A2 down by the lift: Brel at the tap passes on Mother Snuff's word (her oven cold in this save: yesterday's bread), Kell won't leave the handle, Twinsen offers one trip; the deck comes down, Brel wheels his barrow on and rides on the deck",
    await comeByTheLift(), (v) => v.call && v.ph === 'ready' && v.deck === 0 && v.barrow[0] && v.barrow[1] === 0 && v.barrow[2] < 0.05 && v.brel[0] === 0 && v.brel[1] && v.said.some((s) => /yesterday's/.test(s)) && v.said.some((s) => /I watch my cloth/.test(s)));
  void call;
  await shot('A2-barrow-aboard');
  await handover(READY);
  if (process.env.KEEP_READY) fs.copyFileSync(READY, process.env.KEEP_READY);
  is('A3 Save & quit → Continue with the barrow aboard: the deck down, the barrow and Brel on it, Kell at his lever, the handle offered', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, k = P.npc('zl_kell'), n = P.npc('zl_brel'); game.step(0.5);
    return [f.zt_lunchCall, LT.lunchPh, +(L.deckY - L.low).toFixed(2), L.barrowAt().shown, +(n.pos.y - L.low).toFixed(2), +Math.hypot(k.pos.x - L.spots.kell.x, k.pos.z - L.spots.kell.z).toFixed(2), k.present];
  }), (v) => v[0] === true && v[1] === 'ready' && v[2] === 0 && v[3] && v[4] === 0 && v[5] < 0.3 && v[6]);
  const tk = is("A4 the handle taken: Kell hands it over and goes for his bread; Twinsen at the lever facing it; the toast says the keys; the prompt says how to let go", await takeHandle(),
    (v) => v.hold && v.at < 0.35 && Math.abs(v.facing + Math.PI / 2) < 0.05 && v.toast.some((s) => /Lift handle/.test(s)) && /Let Go/.test(v.prompt || ''));
  void tk;
  is('A5 Kell has left the lane (gone for his bread)', await ev(() => { game.step(6); const k = P.npc('zl_kell'); return [k.present, game.story.cur.lift.kellAway]; }), (v) => v[0] === false && v[1] === true);
  await shot('A5-at-the-handle-cloth-high');
  const frames = await ev(() => SS.hold('ArrowUp', () => SS.err() <= 0.35));
  await shot('A6a-cloth-near-the-nail');
  is('A6 first try: Up held while the cloth comes down to the nail, let go there: level (within the 7 cm the nail and knot overlap)', await ev(() => {
    const n = SS.hold('ArrowUp', () => SS.err() <= 0.012); return { n, err: SS.err(), deck: +(game.story.cur.lift.L.deckY - game.story.cur.lift.L.top).toFixed(3) };
  }), (v) => Math.abs(v.err) <= 0.07 && Math.abs(v.deck) <= 0.07);
  await shot('A6b-cloth-at-the-nail');
  const t = await waitDone();
  await shot('A7-over-the-joint');
  is('A7 level the first time: the wheel over the joint (its sound, once), the barrow seen onto the terrace by the service door, no jolt; Kell back with his bread ("yesterday\'s"), then at his lever; Twinsen free', await ev(() => {
    const G = game, f = G.flags, LT = G.story.cur.lift, L = LT.L, b = L.barrowAt(), k = P.npc('zl_kell');
    return { lunch: f.zt_lunch, misses: LT.misses, wheel: SS.snd.filter((s) => s === 'wheelJoint').length, thump: SS.snd.includes('thump'), barrow: [b.shown, +(b.y - L.top).toFixed(2), +Math.hypot(b.x - L.shift.barrowOff.x, b.z - L.shift.barrowOff.z).toFixed(2)],
      kell: [k.present, +Math.hypot(k.pos.x - L.spots.kell.x, k.pos.z - L.spots.kell.z).toFixed(2)], free: !G.heroHold && !LT.hold, said: SS.said.map((s) => s[1]).filter((s) => /jealous|Yesterday's|Still warm/.test(s)), journal: G.story.journal?.()?.some?.((j) => j.key === 'zt_j_lunch') };
  }), (v) => v.lunch === true && v.misses === 0 && v.wheel === 1 && !v.thump && v.barrow[0] && v.barrow[1] === 0 && v.barrow[2] < 0.05 && v.kell[0] && v.kell[1] < 0.4 && v.free && v.said.length >= 2);
  void frames; void t;
  await handover();
  is('A8 Save & quit → Continue after the lunch: the deck up at the landing, the barrow by the service door, Brel up there unloading, Kell at his lever with his after-lunch word; no handle prompt', await ev(() => {
    const G = game, f = G.flags, LT = G.story.cur.lift, L = LT.L, n = P.npc('zl_brel'), b = L.barrowAt();
    const r = P.talk('zl_kell', { run: true });
    return [f.zt_lunch, +(L.deckY - L.top).toFixed(2), b.shown, +(n.pos.y - L.top).toFixed(1), SS.said.map((s) => s[1]).some((s) => /somebody else drives/.test(s)), r.r];
  }), (v) => v[0] === true && v[1] === 0 && v[2] && v[3] === 0 && v[4]);
  is('A9 the chapter goes on as before: Irsa\'s bench, then Baldino', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, h = game.hero;
    const idle = () => { for (let i = 0; i < 60 && (h.steer || h.actT > 0); i++) game.step(0.25); P.settle(); };
    P.talk('zl_irsa', { run: true }); for (let k = 0; k < 2; k++) { P.use(L.dial.x, L.dial.z, { near: 0.9, kind: 'zt_dial' }); idle(); }
    P.use(L.crank.x, L.crank.z, { near: 0.9, kind: 'zt_crank' }); idle(); for (let i = 0; i < 60 && !f.zt_bench; i++) { game.step(0.25); P.settle(); }
    const r = P.talk('baldino', { run: true }); return [f.zt_bench, f.c2_plan];
  }), (v) => v[0] === true && v[1] === true);
  await browser.close();
}

if (want('B') && fs.existsSync(READY)) {
  await start(null, null, READY);
  await takeHandle();
  is('B1 past the nail (Up held 0.25 m beyond it), let go: Brel\'s wheel catches the lip, the barrow jolts back (seen), "Down a touch!"; the deck stays where it was stopped', await ev(() => {
    const L = SS.lift(), LT = game.story.cur.lift;
    SS.hold('ArrowUp', () => SS.err() <= -0.25); const stop = L.deckY; let maxX = 0; const x0 = L.barrowAt().x;
    for (let i = 0; i < 40; i++) { game.step(1 / 30); maxX = Math.max(maxX, x0 - L.barrowAt().x); if (game.state === 'dialog') break; }
    const said = [...SS.said].pop()?.[1]; P.settle();
    return { misses: LT.misses, thump: SS.snd.includes('thump'), jolt: +maxX.toFixed(2), said, kept: +(L.deckY - stop).toFixed(3), err: SS.err(), hold: !!LT.hold };
  }), (v) => v.misses === 1 && v.thump && v.jolt > 0.15 && /Down a touch/.test(v.said || '') && v.kept === 0 && v.hold);
  await shot('B1-near-miss-over');
  is('B2 nudged down from there with short taps of Down (no restart): level, then over the joint', await ev(() => {
    const L = SS.lift(), LT = game.story.cur.lift; let taps = 0;
    for (; taps < 40 && SS.err() < -0.035; taps++) { P.holdFor(['ArrowDown'], 0.1); game.step(0.05); }
    for (let i = 0; i < 30 && !LT.tweens.length && game.state === 'play'; i++) game.step(0.05);
    const t = SS.until(() => game.flags.zt_lunch && !LT.walks.length, 60);
    return { taps, err: SS.err(), lunch: game.flags.zt_lunch, misses: LT.misses, wheel: SS.snd.filter((s) => s === 'wheelJoint').length, t };
  }), (v) => v.taps > 0 && v.taps < 40 && v.lunch === true && v.misses === 1 && v.wheel === 1);
  await browser.close();
  await start(null, null, READY);
  await takeHandle();
  is('B3 short of the nail twice: "Up a touch!", then "Up a touch! Cloth to the nail, Twinsen." (the clue named on the second miss, not repeated after)', await ev(() => {
    const L = SS.lift(), LT = game.story.cur.lift, out = [];
    SS.hold('ArrowUp', () => SS.err() <= 0.3); for (let i = 0; i < 40 && game.state !== 'dialog'; i++) game.step(1 / 30); out.push([...SS.said].pop()?.[1]); P.settle();
    SS.hold('ArrowUp', () => SS.err() <= 0.15); for (let i = 0; i < 40 && game.state !== 'dialog'; i++) game.step(1 / 30); out.push([...SS.said].pop()?.[1]); P.settle();
    SS.hold('ArrowUp', () => SS.err() <= 0.012); SS.until(() => game.flags.zt_lunch && !LT.walks.length, 60);
    return { said: out, misses: LT.misses, lunch: game.flags.zt_lunch };
  }), (v) => /^Up a touch!$/.test(v.said[0] || '') && /Cloth to the nail/.test(v.said[1] || '') && v.misses === 2 && v.lunch === true);
  await browser.close();
}

if (want('C') && fs.existsSync(READY)) {
  await start(null, null, READY);
  await takeHandle();
  is('C1 half up, then let go (E) and walked off down the lane: the deck stays where it is; Kell comes back with his bread and waits by the lever; the barrow still aboard', await ev(() => {
    const L = SS.lift(), LT = game.story.cur.lift, S = L.spots;
    SS.hold('ArrowUp', () => L.deckY >= L.half); const y = L.deckY; P.tap('KeyE', 0.2);
    const free = !game.heroHold && !LT.hold;
    P.go(S.kell.x + 9, S.kell.z - 3, { tol: 1, maxT: 60 }); SS.until(() => !LT.kellAway && !LT.walks.length, 60);
    const k = P.npc('zl_kell');
    return { free, kept: +(L.deckY - y).toFixed(3), kell: [k.present, +Math.hypot(k.pos.x - L.shift.kellAside.x, k.pos.z - L.shift.kellAside.z).toFixed(2), !!LT._loaf?.parent], barrow: L.barrowAt().shown };
  }), (v) => v.free && v.kept === 0 && v.kell[0] && v.kell[1] < 0.4 && v.kell[2] && v.barrow);
  await shot('C1-kell-back-with-bread');
  // back to the handle, take it, raise a little, then Esc → Save & quit with it in his hands
  await takeHandle();
  await ev(() => SS.hold('ArrowUp', () => SS.lift().deckY > SS.lift().low + 0.8));
  await handover();
  is('C2 Save & quit with the handle in his hands → Continue: nothing in hand, the deck back down with the barrow and Brel, Kell back by the lever with his bread; the handle offered', await ev(() => {
    const L = SS.lift(), LT = game.story.cur.lift, k = P.npc('zl_kell'); game.step(0.5);
    return { hold: !!LT.hold || !!game.heroHold, ph: LT.lunchPh, deck: +(L.deckY - L.low).toFixed(2), barrow: L.barrowAt().shown, kell: [k.present, +Math.hypot(k.pos.x - L.shift.kellAside.x, k.pos.z - L.shift.kellAside.z).toFixed(2)], go: game.flags.zt_lunchGo };
  }), (v) => !v.hold && v.ph === 'ready' && v.deck === 0 && v.barrow && v.kell[0] && v.kell[1] < 0.4 && v.go === true);
  is('C3 the handle taken again (no word from Kell, eating), level the first time: Kell watched it ("Cloth to the nail")', await ev(() => {
    const LT = game.story.cur.lift, L = LT.L, n0 = SS.said.length;
    P.use(L.handle.x, L.handle.z, { near: 1.0, kind: 'zt_handle' }); SS.until(() => !!LT.hold, 20);
    const kellSaid = SS.said.slice(n0).filter((s) => s[0] === 'n_zl_kell').length;
    SS.hold('ArrowUp', () => SS.err() <= 0.012); SS.until(() => game.flags.zt_lunch && !LT.walks.length, 60);
    return { kellSaid, lunch: game.flags.zt_lunch, said: SS.said.slice(n0).map((s) => s[1]).filter((s) => /Cloth to the nail|jealous/.test(s)) };
  }), (v) => v.kellSaid === 0 && v.lunch === true && v.said.some((s) => /I watched/.test(s)));
  await browser.close();
}

if (want('D') && fs.existsSync(READY)) {
  await start(null, null, READY);
  await ev(() => { const G = game; G.settings.sfx = 0; G.settings.voice = 0; G.settings.music = 0; G.applySettings?.(); if (G.audio.vol) { G.audio.vol.master = 0; G.audio.applyVolumes?.(); } });
  await takeHandle();
  is('D1 sound off: a stop short of the nail shows itself (the barrow runs at the lip and comes back; Brel\'s word in the box); then the cloth brought to the nail by sight: over the joint; every decision read from the cloth and the nail', await ev(() => {
    const L = SS.lift(), LT = game.story.cur.lift, G = game;
    SS.hold('ArrowUp', () => SS.err() <= 0.2); const x0 = L.barrowAt().x; let jolt = 0, box = '';
    for (let i = 0; i < 40; i++) { G.step(1 / 30); jolt = Math.max(jolt, x0 - L.barrowAt().x); if (G.state === 'dialog') { G.step(0.6); box = (G.state === 'dialog' && getComputedStyle(document.querySelector('#dialog')).display !== 'none' ? 'shown: ' : 'hidden: ') + ([...SS.said].pop()?.[1] || ''); break; } }
    P.settle();
    SS.hold('ArrowUp', () => SS.err() <= 0.012); SS.until(() => G.flags.zt_lunch && !LT.walks.length, 60);
    return { muted: [G.audio.vol?.master, G.settings.sfx], jolt: +jolt.toFixed(2), box, lunch: G.flags.zt_lunch, barrowOff: +Math.hypot(L.barrowAt().x - L.shift.barrowOff.x, L.barrowAt().z - L.shift.barrowOff.z).toFixed(2) };
  }), (v) => v.muted[0] === 0 && v.jolt > 0.15 && /^shown: Up a touch/.test(v.box) && v.lunch === true && v.barrowOff < 0.05);
  await browser.close();
}

// V  the play camera at the handle (Follow, Far, 1280×720): the cloth high as he takes the handle, half way, at the nail;
//    where the nail and the knot fall in the frame (pictures for a person; the numbers only say they are in the frame)
if (want('V') && fs.existsSync(READY)) {
  await start(null, null, READY);
  is('V0 (A4 again) the handle in his hands: the toast says the keys, the prompt shown says how to let go', await takeHandle(), (v) => v.hold && v.toast.some((s) => /Lift handle/.test(s)) && /Let Go/.test(v.prompt || ''));
  const proj = () => ev(() => {
    const G = game, L = SS.lift(), c = G.camera, V = G.hero.pos.constructor;
    const p = (x, y, z) => { const v = new V(x, y, z).project(c); return [+((v.x + 1) / 2 * innerWidth).toFixed(0), +((1 - v.y) / 2 * innerHeight).toFixed(0)]; };
    const r = L.rope; return { nail: p(r.x, L.nailY, r.z), knot: p(r.x, L.clothY(), r.z), head: p(G.hero.pos.x, G.hero.pos.y + 1.5, G.hero.pos.z), err: SS.err(), cam: G.settings.camera, dist: G.settings.camDist };
  });
  await ev(() => game.step(1.5));
  const v1 = await proj(); await shot('V1-handle-taken-cloth-high');
  await ev(() => SS.hold('ArrowUp', () => SS.err() <= 1.7)); await ev(() => game.step(0.1));
  const v2 = await proj(); await shot('V2-half-way');
  await ev(() => SS.hold('ArrowUp', () => SS.err() <= 0.012)); await ev(() => game.step(0.1));
  const v3 = await proj(); await shot('V3-cloth-at-the-nail');
  const inside = (q) => q[0] > 20 && q[0] < W - 20 && q[1] > 20 && q[1] < H - 20;
  is('V1 Follow/Far at the handle: the nail and, at the stop, the knot are inside the frame, the nail above Twinsen\'s head (pictures V1–V3)', { v1, v2, v3 }, (v) => v.v3.cam === 'follow' && inside(v.v3.nail) && inside(v.v3.knot) && Math.hypot(v.v3.nail[0] - v.v3.knot[0], v.v3.nail[1] - v.v3.knot[1]) < 12 && v.v3.nail[1] < v.v3.head[1]);
  await browser.close();
}

// ------------------------------------------------------------------ chapter 9: Brum comes downstairs
const ch9 = async (tag, add) => {
  await start('new-12-stop', add);
  is(`E${tag}0 the save: chapter 9, the stop thrown, Mill Lane dry; no lunch in this game (the optional scene skipped); Brum has come down to the dry tap`, await ev(() => {
    const G = game, f = G.flags, L = SS.lift(), b = P.npc('councilC'); return [f.chapterKey, !!f.cn_stop, !!f.cn_lane, !!f.zt_lunch, b.present, b.present && +Math.hypot(b.pos.x - L.shift.brumDry.x, b.pos.z - L.shift.brumDry.z).toFixed(2), G.story.inCampaign('throttle')];
  }), (v) => v[0] === 'council' && v[1] && !v[2] && !v[3] && v[4] && v[5] < 0.5);
  is(`E${tag}1 Brum by the dry tap: "I voted for this, so I came down to look at it."; the bench's isolator, both relays, by input`, await ev(() => {
    const G = game, f = G.flags; const r = P.talk('councilC', { run: true }); const said = SS.said.map((s) => s[1]).some((s) => /I voted for this/.test(s));
    const e = P.enter('workshop', { run: true }); P.settle(); const T = G.rooms.workshop.life.terminals;
    for (const k of ['A', 'B']) { P.use(T[k].x, T[k].z, { kind: 'cn_iso', near: 0.6 }); for (let i = 0; i < 60 && !f['cn_iso' + k]; i++) { G.step(0.1); P.settle(); } }
    return [r.r, said, e.r, !!f.cn_iso];
  }), (v) => v[1] && v[3]);
  is(`E${tag}2 the isolator on Kell's feed: the motor runs off the mills, the deck comes down to the lane with the cart, Kell says why the handle needs a hand now, Brum offers his, Kell (no lunch in this game) names the cloth and steps onto the deck`, await ev(() => {
    const G = game, f = G.flags, L = SS.lift(), KT = G.story.cur.thread.kell;
    P.enter('zeelich'); const r = P.use(L.isoAt.x, L.isoAt.z, { kind: 'cn_clip', near: 0.6, run: true });
    SS.until(() => !KT.busy && !KT.walks.length && G.state === 'play', 90);
    const k = P.npc('zl_kell'), b = P.npc('councilC'), n = P.npc('zl_brel');
    return { lane: f.cn_lane, bv: f.cn_bv, deck: +(L.deckY - L.low).toFixed(2), cart: L.cartK, kell: +Math.hypot(k.pos.x - L.kellDeck.x, k.pos.z - L.kellDeck.z).toFixed(2), brum: +Math.hypot(b.pos.x - L.shift.brumWait.x, b.pos.z - L.shift.brumWait.z).toFixed(2), brel: +Math.hypot(n.pos.x - L.shift.brelTug.x, n.pos.z - L.shift.brelTug.z).toFixed(2),
      said: SS.said.map((s) => s[1]).filter((s) => /stopped herself|I take the handle|cloth on the cable/.test(s)).length, obj: G.story.objective().replace(/<[^>]+>/g, ''), chapter: f.chapterKey };
  }), (v) => v.lane && v.bv === 1 && v.deck === 0 && v.cart === 0 && v.kell < 0.5 && v.brum < 0.6 && v.brel < 0.6 && v.said === 3 && /Show Brum/.test(v.obj) && v.chapter === 'council');
  await shot(`E${tag}2-lesson-waiting`);
  is(`E${tag}3 Twinsen keeps away: Brel tugs the cable (the cloth jumps) and says which one, once; a later tug is silent`, await ev(() => {
    const G = game, L = SS.lift(), KT = G.story.cur.thread.kell, n0 = SS.said.length;
    P.go(L.handle.x + 4, L.handle.z + 4, { tol: 0.8, maxT: 30 }); SS.until(() => KT.tugs >= 1, 20); P.settle(); const first = SS.said.slice(n0).map((s) => s[1]);
    const n1 = SS.said.length; SS.until(() => KT.tugs >= 2, 40); P.settle();
    return { tugs: KT.tugs, first, later: SS.said.slice(n1).length, rattle: SS.snd.filter((s) => s === 'rattle').length };
  }), (v) => v.tugs >= 2 && v.first.some((s) => /The cloth on the cable/.test(s)) && v.later === 0 && v.rattle >= 2);
  await handover();
  is(`E${tag}4 Save & quit → Continue in the lesson: the deck down with the cart, Kell on it, Brum waiting, Brel by the cable, the objective; Kell's and Brum's words`, await ev(() => {
    const G = game, f = G.flags, L = SS.lift(); G.step(0.5);
    const k = P.npc('zl_kell'), b = P.npc('councilC');
    return { deck: +(L.deckY - L.low).toFixed(2), kell: [+Math.hypot(k.pos.x - L.kellDeck.x, k.pos.z - L.kellDeck.z).toFixed(2), +(k.pos.y - L.low).toFixed(2)], brum: +Math.hypot(b.pos.x - L.shift.brumWait.x, b.pos.z - L.shift.brumWait.z).toFixed(2), obj: G.story.objective().replace(/<[^>]+>/g, ''), show: !!f.cn_brumShow, iso: L.isoShown() };
  }), (v) => v.deck === 0 && v.kell[0] < 0.4 && Math.abs(v.kell[1]) < 0.05 && v.brum < 0.4 && /Show Brum/.test(v.obj) && !v.show && v.iso);
  is(`E${tag}5 at the handle, Twinsen shows him: the landing can't be seen, the cloth on the cable, cloth to the nail; Brel minds the coat; Twinsen steps aside and Brum takes the handle`, await ev(() => {
    const G = game, f = G.flags, L = SS.lift(), n0 = SS.said.length;
    const r = P.use(L.handle.x, L.handle.z, { near: 1.0, kind: 'cn_show' });
    SS.until(() => !!f.cn_brumShow, 30);
    for (let i = 0; i < 30 && !G.story.cur.thread.kell.tripOn; i++) G.step(0.1);
    const b = P.npc('councilC');
    return { r: r.r, show: f.cn_brumShow, said: SS.said.slice(n0).map((s) => s[1]), brum: +Math.hypot(b.pos.x - L.spots.kell.x, b.pos.z - L.spots.kell.z).toFixed(2), trip: G.story.cur.thread.kell.tripOn };
  }), (v) => v.show === true && v.said.some((s) => /can't see the landing/.test(s)) && v.said.some((s) => /^Cloth to the nail\.$/.test(s)) && v.said.some((s) => /coat clear of the cable/.test(s)) && v.brum < 0.5);
  await shot(`E${tag}5-brum-at-the-handle`);
  await handover();   // (during his trip: the save at the lesson's end)
  const r6 = is(`E${tag}6 Save & quit during Brum's trip → Continue: his trip runs again from the lane: up with Kell and the cart, stopped with the cloth at the nail, the cart's wheel over the joint (once), the water; Kell's thanks → chapter 10`, await ev(() => {
    const G = game, f = G.flags, L = SS.lift(), KT = G.story.cur.thread.kell; let errAtStop = null;
    const t = SS.until(() => { if (errAtStop == null && KT.cartRoll) errAtStop = SS.err(); return f.chapterKey !== 'council'; }, 120); P.settle(60); P.settle(30);
    return { brum: f.cn_brum, err: errAtStop, wheel: SS.snd.filter((s) => s === 'wheelJoint').length, said: SS.said.map((s) => s[1]).filter((s) => /Level as a table|Water! Cold/.test(s)).length, chapter: f.chapterKey, t };
  }), (v) => v.brum === true && v.err === 0 && v.wheel === 1 && v.said === 2 && v.chapter !== 'council');
  return r6;
};
if (want('E')) {
  const r = await ch9('', null);
  is('E7 the expanded campaign goes on to chapter 10, Borrowed Time', r, (v) => v.chapter === 'throttle');
  await browser.close();
  // (a base-campaign game is only ever a save from before the expansion that had reached the network (main.js migrateSave):
  //  it can never play the new chapter 9, so the revisit is checked on the expanded campaign's network chapter)
  await start('base-13', { __exp: 1, cn_bv: 1, cn_brumShow: true, cn_brum: true });
  is('E8 STAGED a later visit (the expanded campaign\'s network chapter, from Baldino\'s workshop, by input): Mill Lane: Brum at the handle, his council coat on its peg clear of the cable, Kell up by the cart at the cistern; Brum\'s word', await ev(() => {
    const G = game; P.settle(); const e = P.enter('zeelich', { run: true }); P.settle(); const L = SS.lift(), b = P.npc('councilC'), k = P.npc('zl_kell');
    const S = L.spots; P.go(S.kell.x + 2.6, S.kell.z + 0.9, { tol: 0.6, maxT: 90 }); P.face(b.pos.x, b.pos.z); G.step(1);
    const r = P.talk('councilC'); const said = SS.said.map((s) => s[1]).slice(-2);
    return { exp: G.story.inCampaign('throttle'), e: e.r, coat: L.coatShown(), brum: [b.present, +Math.hypot(b.pos.x - S.kell.x, b.pos.z - S.kell.z).toFixed(2)], kell: [k.present, +Math.hypot(k.pos.x - L.shift.kellCart.x, k.pos.z - L.shift.kellCart.z).toFixed(2), +(k.pos.y - L.top).toFixed(1)], r: r.r, said };
  }), (v) => v.exp && v.coat && v.brum[0] && v.brum[1] < 0.4 && v.kell[0] && v.kell[1] < 0.5 && v.kell[2] === 0 && v.said.some((s) => /Cloth to the nail|coat stays/.test(s)));
  await shot('E8-revisit-brum-coat');
  await browser.close();
}

// ------------------------------------------------------------------ the Core
const SW = () => ev(() => { window.SWAIT = (max = 400, until = null) => { const G = game; let i = 0; for (; i < max && (G.story._sh?.busy || G.state === 'dialog' || G.hero.actT > 0 || G.hero.steer || G.trans || G.story._sh?.msg || (until && !until())); i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } P.settle(); return i; };
  window.STRY = (p, lo, hi) => { const G = game, h = G.hero, sh = G.story._sh, fx = p.x - Math.sin(p.a) * 0.55 + Math.cos(p.a) * 0.38, fz = p.z - Math.cos(p.a) * 0.55 - Math.sin(p.a) * 0.38; P.go(fx, fz, { tol: 0.15, maxT: 8, fight: false }); P.face(p.x, p.z); for (let w = 0; w < 400 && !(sh.phase() >= lo && sh.phase() < hi); w++) G.step(1 / 60); P.tap('KeyE', 0.05); for (let w = 0; w < 80 && (h.steer || h.actT > 0); w++) G.step(0.05); }; });
const core = async (tag, add, expectShift, helped) => {
  await start('new-15-last', add); await SW();
  const r = is(`F${tag}1 the branch turned in the rest: ${expectShift ? 'Kell starts on the radio, Brum: "Cloth to the nail. I know.", Kell to the cart, the wheel\'s caption (and its sound), then Irsa' : 'Irsa\'s line alone, as before (no Kell, no Brum, no wheel)'}; Vesk (${helped ? 'pulled clear' : 'left'}) turns his own key`, await ev(() => {
    const G = game, f = G.flags, B = G.room.branch, n0 = SS.said.length, s0 = SS.snd.length;
    STRY(B, 1.6, 2.2); SWAIT(500, () => !!f.co_vesk);
    const said = SS.said.slice(n0), i = (re) => said.findIndex((s) => re.test(s[1]));
    const order = [i(/when it gets to the/), i(/^Cloth to the nail\. I know\.$/), i(/see to the cart/), i(/wheel rolls over the lift's joint/), i(/Kell's cart is still climbing/), i(/My key's out/)];
    return { order, names: said.filter((s) => /radio/.test(s[0])).map((s) => s[0]), wheel: SS.snd.slice(s0).filter((s) => s === 'wheelJoint').length, vesk: f.co_vesk, helped: !!f.c3_veskHelped, why: said.some((s) => /It doesn't need me/.test(s[1])), journal: G.story.journal?.()?.map?.((j) => j.key) };
  }), (v) => {
    const o = v.order, irsa = o[4], key = o[5];
    if (v.vesk !== true || v.helped !== helped || v.why !== helped || irsa < 0 || key < irsa) return false;
    if (!expectShift) return o[0] < 0 && o[1] < 0 && o[2] < 0 && o[3] < 0 && v.wheel === 0;
    return o[0] >= 0 && o[0] < o[1] && o[1] < o[2] && o[2] < o[3] && o[3] < irsa && v.wheel === 1 && v.names.includes('n_zl_kellradio') && v.names.includes('n_councilCradio');
  });
  await shot(`F${tag}1-core-radio`);
  is(`F${tag}2 then as before: the bar lifted after her two, two knocks on the main, Arthur hears them, Zoé's signal, the guard names the log and the list → the epilogue`, await ev(() => {
    const G = game, f = G.flags, L = G.room.lock, K = G.room.coreKnocker, h = G.hero, T = G.story._sh, n0 = SS.said.length;
    STRY(L.grip, 1.4, 1.9); SWAIT(100); G.step(3);
    const knock = (n) => { P.use(K.x, K.z, { near: 0.7, kind: 'co_knock' }); for (let i = 1; i < n; i++) { for (let w = 0; w < 60 && (h.steer || h.actT > 0); w++) G.step(0.05); P.tap('KeyE', 0.05); } for (let w = 0; w < 60 && (h.steer || h.actT > 0); w++) G.step(0.05); SWAIT(200, () => !T.msg && !T.busy); };
    knock(2); for (let i = 0; i < 400 && f.chapterKey === 'core'; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
    const said = SS.said.slice(n0).map((s) => s[1]);
    return { lock: f.co_lock, signal: f.co_signal, done: f.c3_done, chapter: f.chapterKey, arthur: said.some((s) => /Twice for water/.test(s)), guard: said.some((s) => /test log you cut/.test(s) && /evacuation list/.test(s)) };
  }), (v) => v.lock === true && v.signal === true && v.done === true && v.chapter === 'home' && v.arthur && v.guard);
  await browser.close();
  return r;
};
if (want('F')) {
  await core('a', null, false, true);
  await core('b', { cn_bv: 1, cn_brumShow: true, cn_brum: true }, true, true);
  await core('c', { cn_bv: 1, cn_brumShow: true, cn_brum: true, c3_veskHelped: undefined }, true, false);
}

// ------------------------------------------------------------------ older saves
if (want('G')) {
  await start('base-13');
  is('G1 base-13 (chapter 10, a save from before, base campaign): Mill Lane as it was — Kell at his lever, no Brum on the lane, no coat, no barrow', await ev(() => {
    const G = game; P.settle(); const e = P.enter('zeelich', { run: true }); P.settle(); const L = SS.lift(), k = P.npc('zl_kell'), b = P.npc('councilC');
    return { base: G.story.inCampaign('throttle') === false, e: e.r, kell: +Math.hypot(k.pos.x - L.spots.kell.x, k.pos.z - L.spots.kell.z).toFixed(2), brumHere: b.present && Math.hypot(b.pos.x - L.spots.kell.x, b.pos.z - L.spots.kell.z) < 30, coat: L.coatShown(), barrow: L.barrowAt().shown };
  }), (v) => v.base && v.kell < 0.4 && !v.brumHere && !v.coat && !v.barrow);
  await browser.close();
  await start('new-12-stop', { cn_isoGot: true, cn_isoA: true, cn_isoB: true, cn_iso: true, cn_lane: true });
  is('G2 STAGED a chapter-9 save with the lane already running and no Brum flags (made on a build before this, just before the end): the chapter ends as it did (Baldino\'s call), no lesson, Brum not at the handle', await ev(() => {
    const G = game, f = G.flags; const n0 = 0; for (let i = 0; i < 400 && f.chapterKey === 'council'; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } P.settle(60);
    const said = SS.said.slice(n0).map((s) => s[1]);
    return { chapter: f.chapterKey, brum: f.cn_brum ?? null, show: f.cn_brumShow ?? null, net: said.some((s) => /A network!/.test(s)), lesson: said.some((s) => /I take the handle/.test(s)) };
  }), (v) => v.chapter !== 'council' && v.brum === null && v.show === null && v.net && !v.lesson);
  await browser.close();
}

// ------------------------------------------------------------------ PART 2 (docs/SECOND-SHIFT.md "Free play", "Hamalayi",
// "Ballastra"; lba3/docs/lba-maturity/SECOND-SHIFT-PART2.md)
const EPI = { __exp: 1, chapterKey: 'home', c3_done: true, c3_turned: true, co_vesk: true, co_lock: true, co_signal: true, ep_dinner: true, ep_free: true, cn_bv: 1, cn_brumShow: true, cn_brum: true, zl_crate: 'shoved', zl_done: true, zl_ask: true, zl_paid: true };
// (STAGED: the area is entered by the game's own enterRoom — the free play's travel from the core is not the subject)
const toLane = () => ev(() => {
  const G = game; P.settle(); G.enterRoom('zeelich', null, true); G.step(0.5); G.story.refreshCast(); for (let i = 0; i < 10; i++) G.step(0.1); P.settle();
  const L = SS.lift(), S = L.spots, h = G.hero; h.pos.set(L.lane.x, G.physics.groundAt(L.lane.x, L.lane.z), L.lane.z); h.angle = Math.atan2(S.kell.x - h.pos.x, S.kell.z - h.pos.z); G.step(1.5);
});
if (want('H')) {
  await start('new-15-last', EPI);
  await toLane();
  const n0 = await ev(() => ({ toasts: (game.hud.toastLog || []).length, obj: game.story.objective().replace(/<[^>]+>/g, ''), journal: (game.story.journal() || []).flatMap((c) => c.lines || []).length }));
  is('H1 STAGED free play after the ending (Brum\'s lesson made, Snuff\'s oven hot), Mill Lane: Brum at the handle, the deck standing at the landing; Kell not on the lane (not at the handle, not by the cart)', await ev(() => {
    const G = game, L = SS.lift(), S = L.spots, k = P.npc('zl_kell'), b = P.npc('councilC');
    const kellOnLane = k.present && G.regions.sceneOf?.(k.pos.x, k.pos.z) === 'zeelich';
    return { brum: [b.present, +Math.hypot(b.pos.x - S.kell.x, b.pos.z - S.kell.z).toFixed(2)], kellOnLane, kellAtHandle: k.present && Math.hypot(k.pos.x - S.kell.x, k.pos.z - S.kell.z) < 3, deck: +(L.deckY - L.top).toFixed(2), moving: !!L.moving };
  }), (v) => v.brum[0] && v.brum[1] < 0.4 && !v.kellOnLane && !v.kellAtHandle && v.deck === 0 && !v.moving);
  await shot('H1-free-play-lane');
  is('H2 into Mother Snuff\'s bakehouse by its door (E, by input): Kell there at his spot with his loaf; asked, "Still warm. Go and get your own."; no banner, no new objective, no journal line', await ev((n0) => {
    const G = game, d = G.story.zlife.doors().find((q) => q.room === 'zh_bakery');
    const u = P.use(d.x, d.z, { near: 1.0, kind: 'zhenter' }); for (let i = 0; i < 20 && G.room?.id !== 'zh_bakery'; i++) G.step(0.1); P.settle(); G.step(1);
    const k = P.npc('zl_kell'), sp = G.story.chapters[2].lift.place('zl_kell'), hand = k.rig.j?.armR?.hand;
    const r = P.talk('zl_kell'); const said = SS.said.map((s) => s[1]).slice(-1);
    return { u: u.r, room: G.room?.id, kell: [k.present, +Math.hypot(k.pos.x - sp.x, k.pos.z - sp.z).toFixed(2)], loaf: !!hand?.children.some((c) => c.isMesh && c.visible), said, toasts: (G.hud.toastLog || []).length - n0.toasts, obj: G.story.objective().replace(/<[^>]+>/g, '') === n0.obj, journal: (G.story.journal() || []).flatMap((c) => c.lines || []).length - n0.journal };
  }, n0), (v) => v.room === 'zh_bakery' && v.kell[0] && v.kell[1] < 0.4 && v.loaf && v.said.some((s) => /^Still warm\. Go and get your own\.$/.test(s)) && v.toasts === 0 && v.obj && v.journal === 0);
  await shot('H2-kell-in-the-bakery');
  await handover();
  is('H3 Save & quit in the bakehouse → Continue: Kell still there with his loaf; Brum still the only one at the handle', await ev(() => {
    const G = game; G.step(1); for (let i = 0; i < 100 && !P.npc('zl_kell').present; i++) G.step(0.1);   // (the bakehouse built under the load: he is placed once it is)
    const k = P.npc('zl_kell'), sp = G.story.chapters[2].lift.place('zl_kell'), hand = k.rig.j?.armR?.hand;
    const L = G.regions.built('zeelich')?.lift, b = P.npc('councilC');
    return { room: G.room?.id, kell: [k.present, sp ? +Math.hypot(k.pos.x - sp.x, k.pos.z - sp.z).toFixed(2) : null], loaf: !!hand?.children.some((c) => c.isMesh && c.visible), brum: L ? +Math.hypot(b.pos.x - L.spots.kell.x, b.pos.z - L.spots.kell.z).toFixed(2) : null };
  }), (v) => v.room === 'zh_bakery' && v.kell[0] && v.kell[1] < 0.4 && v.loaf && (v.brum === null || v.brum < 0.4));
  await browser.close();
  await start('new-15-last', { ...EPI, cn_bv: undefined, cn_brumShow: undefined, cn_brum: undefined });
  await toLane();
  is('H4 STAGED a free play without Brum\'s lesson (a game from before it, or one that never played it): Kell at his lever as before, nobody in his place, not in the bakehouse', await ev(() => {
    const L = SS.lift(), k = P.npc('zl_kell'); return [k.present, +Math.hypot(k.pos.x - L.spots.kell.x, k.pos.z - L.spots.kell.z).toFixed(2), game.story.chapters[2].lift.breadTime()];
  }), (v) => v[0] && v[1] < 0.4 && v[2] === false);
  await browser.close();
}

// the chapter-7 page helpers: the shutter, what was flashed and heard
const ham = () => ev(() => {
  window.HM = {
    M: () => game.regions.built('hamalayi'), T: () => game.story.cur.roof,
    near: (id, p) => { const n = P.npc(id); return n?.present ? +Math.hypot(n.pos.x - p.x, n.pos.z - p.z).toFixed(2) : null; },
    // up the ridge by input to the peak (a remark on the way read as a player would)
    climb() { const G = game, S = HM.M().shutter, h = G.hero; for (let k = 0; k < 5 && Math.hypot(h.pos.x - S.x, h.pos.z - S.z) > 9 && !HM.T().busy; k++) { P.go(S.x + 3, S.z - 7, { tol: 1.0, maxT: 200, stopWhen: () => G.state === 'dialog' }); P.settle(); } },
    flashes: 0,
  };
});
if (want('I')) {
  await start('base-10');
  await ham();
  is('I0 chapter 7 from its start (base-10, Sefa not met): the scene ahead (rf_v); Tashi at the lift\'s top landing by its crank; Pim and Sefa up at the shutter on the peak; a line of sight from the shutter to the goats\' house ridge and to Tashi, none to Lhar\'s square (the rock shelf)', await ev(() => {
    const G = game, f = G.flags, M = HM.M(), S = M.shutter, P2 = G.physics, gh = M.goatHouse, st = S.station, sq = M.lhar;
    // (from 0.6 m ahead of the mirror, toward each: the shutter's own post is round its middle)
    const los = (x, y, z) => { const e = S.eye, d = Math.hypot(x - e.x, z - e.z); return P2.lineOfSight(e.x + (x - e.x) / d * 0.6, e.y, e.z + (z - e.z) / d * 0.6, x, y, z); };
    return { v: f.rf_v, key: f.chapterKey, tashi: HM.near('lhar1', st), pim: HM.near('pim', S.pim), sefa: HM.near('keeper', S.sefa),
      losRoof: los(gh.x, gh.ridgeY + 0.3, gh.z), losTashi: los(st.x, P2.groundAt(st.x, st.z) + 1.3, st.z), losSquare: los(sq.x, P2.groundAt(sq.x, sq.z) + 1.6, sq.z) };
  }), (v) => v.v === 1 && v.key === 'observatory' && v.tashi < 0.4 && v.pim < 0.4 && v.sefa < 0.4 && v.losRoof && v.losTashi && !v.losSquare);
  is('I1 by input up the ridge: Sefa greets him once, signals three long and one short at the roof he remembers (the light on the goats\' house, the slats\' clack, nothing answers); Pim: Grandma\'s old house, the goats; "I\'d know if anyone ever came up."; Twinsen will try Tashi', await ev(() => {
    const G = game, f = G.flags, T = HM.T(), M = HM.M(), gh = M.goatHouse; let lit = null;
    HM.climb();
    for (let i = 0; i < 900 && !f.rf_shut; i++) { if (G.state === 'dialog') P.settle(); else { G.step(0.1); if (T._spot?.visible && !lit) lit = +Math.hypot(T._spot.position.x + M.group.position.x - gh.x, T._spot.position.z + M.group.position.z - gh.z).toFixed(1); } }
    P.settle();
    const said = SS.said.map((s) => s[1]), i = (re) => said.findIndex((s) => re.test(s));
    return { shut: f.rf_shut, roof: f.rf_roof ?? null, lit, clacks: SS.snd.filter((s) => s === 'gearClack').length, blips: SS.snd.filter((s) => s === 'blip').length,
      order: [i(/^A visitor\./), i(/Three long, one short/), i(/^Nothing\. She always answered/), i(/where we keep the goats now/), i(/^Goats\.$/), i(/You'd know if you ever came down/), i(/I'd know if anyone ever came up/), i(/Let me try him/)],
      greet: said.filter((s) => /^A visitor\./.test(s)).length, obj: G.story.objective().replace(/<[^>]+>/g, '') };
  }), (v) => v.shut === true && v.roof === null && v.lit !== null && v.lit < 3.5 && v.clacks === 8 && v.blips === 0 && v.order.every((o, k) => o >= 0 && (k === 0 || o > v.order[k - 1])) && v.greet === 1 && /Signal Tashi/.test(v.obj));
  await shot('I1-the-shutter-his-turn');
  await handover(); await ham();
  is('I2 Save & quit → Continue at that point: Sefa stepped aside, Pim by the shutter, its prompt from behind it, the objective; the shutter aimed at the old roof', await ev(() => {
    const G = game, f = G.flags, S = HM.M().shutter; G.step(0.5);
    const go = P.go(S.sefa.x, S.sefa.z, { tol: 0.3, maxT: 60 }); P.face(S.x, S.z);
    return { shut: f.rf_shut, sefa: HM.near('keeper', S.aside), pim: HM.near('pim', S.pim), prompt: P.target()?.kind, aim: +Math.abs(S.az - S.az0).toFixed(3), obj: G.story.objective().replace(/<[^>]+>/g, '') };
  }), (v) => v.shut === true && v.sefa < 0.5 && v.pim < 0.5 && v.prompt === 'rf_shutter' && v.aim < 0.01 && /Signal Tashi/.test(v.obj));
  is('I3 the shutter taken (E, by input): in his hands, the slats open, the toast says the keys; swung a little and let go (E): nothing in hand, the prompt again; taken again', await ev(() => {
    const G = game, T = HM.T(), S = HM.M().shutter;
    const u = P.use(S.sefa.x, S.sefa.z, { near: 0.5, kind: 'rf_shutter' }); for (let i = 0; i < 40 && !T.hold; i++) G.step(0.1);
    const held = !!T.hold && G.heroHold === T._holdFn, toast = (G.hud.toastLog || []).slice(-1);
    SS.hold('ArrowLeft', () => false, 12); G.step(0.5); P.tap('KeyE', 0.1); G.step(0.3);
    const let0 = !T.hold && !G.heroHold, again = P.target()?.kind;
    P.tap('KeyE', 0.1); for (let i = 0; i < 40 && !T.hold; i++) G.step(0.1);
    return { u: u.r, held, toast, let0, again, held2: !!T.hold };
  }), (v) => v.held && v.toast.some((s) => /Shutter/.test(s)) && v.let0 && v.again === 'rf_shutter' && v.held2);
  is('I4 swung left across the snow (and tipped nearer if he must) until the light reaches the landing: Tashi answers at once from his belt buckle — two quick, one long (seen: the flash; heard: three blips; the caption) — Pim, Sefa "Somebody answered.", Sefa goes in; no waiting', await ev(() => {
    const G = game, f = G.flags, T = HM.T(); let flashSeen = 0, frames = 0;
    // (a player watching the light: left until it is level with the landing, then nearer (or farther) until it is on it)
    const S = T.S, want = Math.atan2(S.station.x - S.eye.x, S.station.z - S.eye.z);
    frames += SS.hold('ArrowLeft', () => f.rf_roof || S.az >= want - 0.02, 300);
    if (!f.rf_roof) frames += SS.hold('ArrowDown', () => f.rf_roof || T.hold?.R <= 15, 250);
    if (!f.rf_roof) frames += SS.hold('ArrowUp', () => f.rf_roof, 300);
    for (let i = 0; i < 60; i++) { G.step(1 / 30); if (T._flash?.visible) flashSeen++; }
    const t0 = G.time; for (let i = 0; i < 300 && (G.state === 'dialog' || T.walk || T.later.length); i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
    const said = SS.said.map((s) => s[1]);
    return { roof: f.rf_roof, frames, flashSeen, blips: SS.snd.filter((s) => s === 'blip').length, caption: said.some((s) => /A flash answers/.test(s)), buckle: said.some((s) => /belt buckle/.test(s)), answered: said.some((s) => /^Somebody answered\.$/.test(s)),
      sefaIn: !!G.rooms.obsv && HM.near('keeper', G.rooms.obsv.npcSpots.keeper) !== null && HM.near('keeper', G.rooms.obsv.npcSpots.keeper) < 0.5, free: !G.heroHold && !T.hold, obj: G.story.objective().replace(/<[^>]+>/g, '') };
  }), (v) => v.roof === true && v.frames < 600 && v.flashSeen > 0 && v.blips >= 3 && v.caption && v.buckle && v.answered && v.free && /Follow Sefa/.test(v.obj));
  await shot('I4-after-the-answer');
  is('I5 into the dome by input: Sefa\'s talk starts at Twinsen\'s question (no second greeting); the mirrors\' part as before (c7_keeper); the journal has the roof', await ev(() => {
    const G = game, f = G.flags, d = HM.M().observatory.door; let r = P.through(d.x, d.z, { run: true }); for (let k = 0; k < 2 && G.room?.id !== 'obsv'; k++) { P.settle(); r = P.through(d.x, d.z, { run: true }); }
    const n0 = SS.said.length; P.talk('keeper'); P.settle(); const said = SS.said.slice(n0).map((s) => s[1]);
    return { room: G.room?.id, keeper: f.c7_keeper, greet: said.some((s) => /^A visitor\./.test(s)), first: said[0], journal: (G.story.journal() || []).flatMap((c) => c.lines || []).some((l) => l.key === 'rf_j_roof') };
  }), (v) => v.room === 'obsv' && v.keeper === true && !v.greet && /vent under the glacier/.test(v.first || '') && v.journal);
  await handover(); await ham();
  is('I6 Save & quit → Continue after: the shutter turned toward the landing; Pim still up by it, Tashi\'s word about his buckle; Sefa in his dome', await ev(() => {
    const G = game, f = G.flags; if (G.room?.id !== 'hamalayi') { const ex = G.room?.exits?.[0]; if (ex) { P.through(ex.x, ex.z); P.settle(); } }
    const M = HM.M(), S = M.shutter, T = HM.T(), aim = T.aimAt(S.station, 1.0);
    return { roof: f.rf_roof, aimed: +Math.abs(S.az - aim.az).toFixed(3), pim: HM.near('pim', S.pim), room: G.room?.id };
  }), (v) => v.roof === true && v.aimed < 0.01 && v.pim < 0.5);
  await browser.close();
  await start('new-10-lit');
  await ham();
  is('I7 an older chapter-7 save with Sefa met and the crystal lit (new-10-lit): no scene (no rf_v); Pim not on the peak, Sefa not outside; the shutter only looked at', await ev(() => {
    const G = game, f = G.flags, S = HM.M()?.shutter; return { v: f.rf_v ?? null, pim: S ? HM.near('pim', S.pim) : null, sefa: S ? HM.near('keeper', S.sefa) : null, outside: G.story.cur.roof.outside() };
  }), (v) => v.v === null && (v.pim === null || v.pim > 3) && (v.sefa === null || v.sefa > 3) && !v.outside);
  await browser.close();
}

const WK = { __exp: 1, chapterKey: 'survey',
  c9_started: true, c9_form: true, c9_nara: true, c9_oku: true, c9_clerk: true, c9_heard: true, c9_plans: true, c9_vote: true,
  cn_v: 1, cn_closed: true, cn_kell: true, cn_log: true, cn_stop: true, cn_isoGot: true, cn_isoA: true, cn_isoB: true, cn_iso: true, cn_lane: true,
  og_started: true, og_home: true, og_arrived: true, og_room: true, og_bleed: 3, og_steady: true, og_thanks: true, th_zoeGo: true, th_met: true, th_reg: true, th_cA: true, th_cC: true, th_cB: 2, th_b7: true,
  th_zoeDone: true, th_fitted: true, th_band: 3, th_set: true, th_push: true, th_lever: true, th_vesk: true, th_done: true, bl_cw: 1, bl_g1: 2, bl_g2: 1, bl_g3: 0, bl_silt: 3, bl_endTalk: true, bl_done: true,
  bh_started: true, bh_go: true, bh_fen1: true, bh_book: true, bh_bench: true, bh_def: true, bh_fig: true, bh_rig1: true, bh_test: true, bh_crates: true, bh_oren: true, bh_done: true,
  wk_started: true, wk_in: true, wk_door: true, wk_card: true, wk_ledger: true, wk_bay2: true, wk_ask: true, wk_ring: true, wk_solo: true, wk_bell: true, wk_rung: true, wk_awake: true };
for (const k of 'started arrived quHail quWeighed sign tessa1 crank hobb released n1 tessa2 seenArches maHail wenna1 gaugeU gaugeL gauges tapSeen tapShut bypassSeen bypass n2 n2seen float rafts2 plan compare chain chainSeen pawlSeen pawl spill dunn n3'.split(' ')) WK['bl_' + k] = true;
const hall = () => ev(() => {
  window.HL = {
    H: () => game.story.chapters.find((c) => c.key === 'survey').hall(), C: () => game.story.chapters.find((c) => c.key === 'survey'),
    rel: (id) => { const n = P.npc(id), R = game.rooms.bl_cradles; return n?.present ? [+(n.pos.x - R.center.x).toFixed(2), +(n.pos.z - R.center.z).toFixed(2), +n.pos.y.toFixed(2), n.rig.anim] : null; },
    seatOK: (id, s) => { const n = P.npc(id); return !!n?.present && n.rig.anim === 'sit' && Math.hypot(n.pos.x - s.x, n.pos.z - s.z) < 0.25 && n.pos.y > 0.2; },
  };
});
// (STAGED: chapter 13 after the families' decision, set by flags on a fixture save as exp-balances.mjs stages its chapters; the hall entered
//  by enterRoom; everything after it by input)
const intoHall = () => ev(() => { const G = game; G.story.refreshCast(); G.step(0.2); P.settle(); G.enterRoom('bl_cradles', null, true); G.step(0.5); G.story.refreshCast(); for (let i = 0; i < 10; i++) G.step(0.1); P.settle(); const R = G.rooms.bl_cradles, h = G.hero; P.go(R.center.x - 2.0, R.center.z + 2.6, { tol: 0.5, maxT: 30 }); });
if (want('J')) {
  await start('new-12-stop', WK);
  await page.waitForFunction(() => game.npcs.some((n) => n.def.id === 'bl_odra'), null, { timeout: 120000 }).catch(() => {});
  await intoHall(); await hall();
  is('J1 STAGED the Cradle Hall after the families\' decision: Tessa waits at the door ("Talk to Tessa"); a moment later Wenna crosses with the row\'s soup to Nan Odra by her mother\'s cradle; Nan Odra won\'t leave her; the chair still against the wall; no word from Oren', await ev(() => {
    const G = game, f = G.flags, H = HL.H(), C = HL.C(), n0 = SS.said.length;
    const obj0 = G.story.objective().replace(/<[^>]+>/g, '');
    for (let i = 0; i < 300 && !f.wk_food; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
    for (let i = 0; i < 100 && (G.state === 'dialog' || C.chairBusy); i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
    const said = SS.said.slice(n0), ch = C.C.chair.group.position, R = G.rooms.bl_cradles;
    return { obj0, food: f.wk_food, wenna: +Math.hypot(P.npc('bl_wenna').pos.x - H.odraSide.x, P.npc('bl_wenna').pos.z - H.odraSide.z).toFixed(2), odra: +Math.hypot(P.npc('bl_odra').pos.x - H.odra.x, P.npc('bl_odra').pos.z - H.odra.z).toFixed(2),
      lines: said.map((s) => s[1]), oren: said.filter((s) => s[0] === 'n_oren').length, chair: [+(ch.x + R.center.x - H.chairWall.x).toFixed(2), +(ch.z + R.center.z - H.chairWall.z).toFixed(2)] };
  }), (v) => /Talk to Tessa/.test(v.obj0) && v.food === true && v.wenna < 0.3 && v.odra < 0.3 && v.lines.some((s) => /Mags sent soup/.test(s)) && v.lines.some((s) => /If there were anything to sit on/.test(s)) && v.oren === 0 && v.chair[0] === 0 && v.chair[1] === 0);
  await shot('J1-wenna-brings-the-soup');
  await handover();
  await hall();
  is('J2 Save & quit → Continue: Wenna still by Nan Odra with the bowl, the chair by the wall with its prompt ("Move"); Tessa\'s objective', await ev(() => {
    const G = game, f = G.flags, H = HL.H(); G.step(1);
    const go = P.go(H.chairWall.x + 0.8, H.chairWall.z, { tol: 0.4, maxT: 60 }); P.face(H.chairWall.x, H.chairWall.z);
    return { food: f.wk_food, chairFlag: f.wk_chair ?? null, wenna: +Math.hypot(P.npc('bl_wenna').pos.x - H.odraSide.x, P.npc('bl_wenna').pos.z - H.odraSide.z).toFixed(2), prompt: P.target()?.kind, obj: G.story.objective().replace(/<[^>]+>/g, '') };
  }), (v) => v.food === true && v.chairFlag === null && v.wenna < 0.3 && v.prompt === 'wk_chair' && /Talk to Tessa/.test(v.obj));
  is('J3 the chair carried by input to the cradle: Wenna sits in it ("Go on, Nan. I\'ve got her."), Nan Odra: "Don\'t let anyone lift her lid. Not yet." and goes to eat at the keepers\' desk, on their stool, the bowl before her; the lid stays shut; no reward', await ev(() => {
    const G = game, f = G.flags, H = HL.H(), C = HL.C(), n0 = SS.said.length, coins = G.hero.coins;
    const u = P.use(H.chairWall.x + 0.6, H.chairWall.z, { near: 0.6, kind: 'wk_chair' });
    for (let i = 0; i < 200 && !f.wk_chair; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
    for (let i = 0; i < 300 && (C.chairBusy || C.walks?.length || G.state === 'dialog'); i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
    G.step(1);
    const ch = C.C.chair.group.position, R = G.rooms.bl_cradles, said = SS.said.slice(n0).map((s) => s[1]);
    const lid = C.C ? R.group : null; void lid;
    return { u: u.r, chair: f.wk_chair, at: +Math.hypot(ch.x + R.center.x - H.chairCradle.x, ch.z + R.center.z - H.chairCradle.z).toFixed(2), wenna: HL.seatOK('bl_wenna', H.chairCradle), odra: HL.seatOK('bl_odra', H.stool), said, coins2: G.hero.coins, coins, oren: SS.said.slice(n0).filter((s) => s[0] === 'n_oren').length, obj: G.story.objective().replace(/<[^>]+>/g, '') };
  }), (v) => v.chair === true && v.at < 0.05 && v.wenna && v.odra && v.said.some((s) => /I've got her/.test(s)) && v.said.some((s) => /lift her lid\. Not yet\./.test(s)) && v.coins2 === v.coins && v.oren === 0 && /Talk to Tessa/.test(v.obj));
  await shot('J3-wenna-in-the-chair');
  is('J4 out of the hall and back in by input: Wenna still in the chair by the cradle, Nan Odra at the desk; her word from the chair', await ev(() => {
    const G = game, H = HL.H(), ex = G.rooms.bl_cradles.exits[0];
    P.through(ex.x, ex.z); P.settle(); const out = G.room?.id; G.step(2);
    const back = G.rooms.bl_arches?.arches?.exits?.toCradles; let r = back ? P.through(back.x, back.z) : null; P.settle(); G.step(1);
    const n0 = SS.said.length; P.talk('bl_wenna'); const said = SS.said.slice(n0).map((s) => s[1]);
    return { out, back: G.room?.id, wenna: HL.seatOK('bl_wenna', H.chairCradle), odra: HL.seatOK('bl_odra', H.stool), said };
  }), (v) => v.out !== 'bl_cradles' && v.back === 'bl_cradles' && v.wenna && v.odra && v.said.some((s) => /Still asleep\. Still not yet\./.test(s)));
  await handover();
  await hall();
  is('J5 Save & quit → Continue: still so (Wenna in the chair at the cradle, Nan Odra at the desk, the chair where he set it)', await ev(() => {
    const G = game, H = HL.H(), C = HL.C(); G.step(1); const ch = C.C.chair.group.position, R = G.rooms.bl_cradles;
    return { wenna: HL.seatOK('bl_wenna', H.chairCradle), odra: HL.seatOK('bl_odra', H.stool), at: +Math.hypot(ch.x + R.center.x - H.chairCradle.x, ch.z + R.center.z - H.chairCradle.z).toFixed(2) };
  }), (v) => v.wenna && v.odra && v.at < 0.05);
  is('J6 Tessa, talked to at the door (by input): her five B-8s, the freighter: chapter 14 begins; a later look at the hall\'s cast (the network on): Wenna still seated by the cradle', await ev(() => {
    const G = game, f = G.flags; P.talk('tessa'); for (let i = 0; i < 600 && f.chapterKey === 'survey'; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } P.settle(60);
    const p = HL.C().place('bl_wenna');
    return { done: f.wk_done, key: f.chapterKey, later: p?.anim ?? null };
  }), (v) => v.done === true && v.key === 'network' && v.later === 'sit');
  await browser.close();
  // a base-campaign game (a save from before the expansion, exp_base) never meets Ballastra: not in its campaign, nothing of it saved
  await start('base-13');
  is('J7 a base-campaign save (base-13: the network, exp_base): chapter 13 not in its campaign; no wk_ or bl_ flag, nothing naming Ballastra or the chair in the saved game outside its chapter table, nobody placed by the hall', await ev(() => {
    const G = game; G.save(false); const raw = localStorage.getItem('lba3_save_v1') || ''; const s = JSON.parse(raw);
    // (the save's chapter table, s.order, names every chapter of the build in every save, the base campaign's too, as it
    //  did before this work: reported, not this scene's. Outside it nothing names Ballastra or the chair)
    const { order, ...rest } = s;
    return { base: !G.story.inCampaign('survey'), keys: Object.keys(s.flags).filter((k) => /^(wk_|bl_|ep_bl)/.test(k)), ballastra: /ballastra|bl_cradles|wk_food|wk_chair/i.test(JSON.stringify(rest)), orderNames: (order || []).filter((k) => /ballastra|balances|survey/.test(k)), wenna: G.story.chapters.find((c) => c.key === 'survey').place('bl_wenna') ?? null };
  }), (v) => v.base && v.keys.length === 0 && !v.ballastra && v.wenna === null);
  await browser.close();
}

done();
fs.rmSync(TMP, { recursive: true, force: true });
