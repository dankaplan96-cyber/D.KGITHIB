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
// ONLY=A|B|C|D|E|F|G (several: ONLY=AB), SHOTS=<dir> writes the play camera's pictures (Follow, Far; 1280×720).
import { launch, open, menu, quitAndKeep, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const ORIGIN = new URL(process.env.GAME_URL || 'http://localhost:8123/').origin;
const ONLY = process.env.ONLY || 'ABCDEFG', SHOTS = process.env.SHOTS;
const want = (k) => ONLY.includes(k);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'shift-'));
// a fixture's save for this run's origin (never the player's own storage: a fresh profile per launch), with flags added
const save = (name, add = null) => {
  const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8'));
  for (const o of j.origins || []) {
    o.origin = ORIGIN;
    if (add) for (const it of o.localStorage || []) if (it.name === 'lba3_save_v1') { const s = JSON.parse(it.value); Object.assign(s.flags, add); for (const k of Object.keys(add)) if (add[k] === undefined) delete s.flags[k]; it.value = JSON.stringify(s); }
  }
  return j;
};
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
    for (let i = 0; i < 40; i++) { G.step(1 / 30); jolt = Math.max(jolt, x0 - L.barrowAt().x); if (G.state === 'dialog') { box = document.querySelector('#dialog .text')?.textContent || ''; break; } }
    P.settle();
    SS.hold('ArrowUp', () => SS.err() <= 0.012); SS.until(() => G.flags.zt_lunch && !LT.walks.length, 60);
    return { muted: [G.audio.vol?.master, G.settings.sfx], jolt: +jolt.toFixed(2), box, lunch: G.flags.zt_lunch, barrowOff: +Math.hypot(L.barrowAt().x - L.shift.barrowOff.x, L.barrowAt().z - L.shift.barrowOff.z).toFixed(2) };
  }), (v) => v.muted[0] === 0 && v.jolt > 0.15 && /Up a touch/.test(v.box) && v.lunch === true && v.barrowOff < 0.05);
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
  const r2 = await ch9('b', { exp_base: 1 });
  is('Eb7 the base campaign goes on to chapter 10, the network', r2, (v) => v.chapter === 'network');
  is('Eb8 Mill Lane revisited (from Baldino\'s workshop, by input): Brum at the handle, his council coat on its peg clear of the cable, Kell up by the cart at the cistern; their words', await ev(() => {
    const G = game; P.settle(); const e = P.enter('zeelich', { run: true }); P.settle(); const L = SS.lift(), b = P.npc('councilC'), k = P.npc('zl_kell');
    const S = L.spots; P.go(S.kell.x + 3.2, S.kell.z + 1.2, { tol: 0.8, maxT: 90 }); P.face(S.kell.x, S.kell.z); G.step(1);
    const r = P.talk('councilC'); const said = SS.said.map((s) => s[1]).slice(-2);
    return { e: e.r, coat: L.coatShown(), brum: [b.present, +Math.hypot(b.pos.x - S.kell.x, b.pos.z - S.kell.z).toFixed(2)], kell: [k.present, +Math.hypot(k.pos.x - L.shift.kellCart.x, k.pos.z - L.shift.kellCart.z).toFixed(2), +(k.pos.y - L.top).toFixed(1)], r: r.r, said };
  }), (v) => v.coat && v.brum[0] && v.brum[1] < 0.4 && v.kell[0] && v.kell[1] < 0.5 && v.kell[2] === 0 && v.said.some((s) => /Cloth to the nail|coat stays/.test(s)));
  await shot('Eb8-revisit-brum-coat');
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
    const G = game, f = G.flags; const n0 = SS.said.length; for (let i = 0; i < 400 && f.chapterKey === 'council'; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } P.settle(60);
    const said = SS.said.slice(n0).map((s) => s[1]);
    return { chapter: f.chapterKey, brum: f.cn_brum ?? null, show: f.cn_brumShow ?? null, net: said.some((s) => /A network!/.test(s)), lesson: said.some((s) => /I take the handle/.test(s)) };
  }), (v) => v.chapter !== 'council' && v.brum === null && v.show === null && v.net && !v.lesson);
  await browser.close();
}

done();
fs.rmSync(TMP, { recursive: true, force: true });
