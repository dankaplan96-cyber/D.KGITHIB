// CLAR-2: how much text the game puts on screen, on the routes the user plays, by INPUT (tests/lib/player.js).
//   node tests/clarity.mjs              GAME_URL as the other tests; HUD=lba (default setting) or HUD=modern
//   OUT=<dir> TAG=<before|after>        keeps a small jpg of each moment (<dir>/<tag>-<hud>-<moment>.jpg)
//   MEASURE=1                           counts only, no budget checks (to measure an older build)
// Routes: (1) the opening's hand-off and the prologue's first minutes (the cupboard, out of the house, the well,
// Gilbert and Mira, the pier), (2) Citadel's street from the house to the harbour, (3) the prologue's cave fight
// (the mites, the ball), (4) chapter 4's wind-pump puzzle at Kesh (Tarra, Sani, Listen, a wrong gear, the right
// one), (5) chapter 11's core fight (the pylons: no instruction toast; a nudge after 40 s stuck). At each moment: the words on screen outside dialogue (tests/lib/textcensus.js C.now) and a screenshot;
// per route: every text the game put up (C.sum: toasts, objective changes, prompt labels, chapter cards) and the
// dialogue lines (counted apart). With the budgets (not MEASURE) the CLAR-2 rules are checked: the objective is
// shown when it changes and then steps aside (kept in the pause menu and the Holomap), no toast repeats what the
// objective or the dialogue just said, key names in hints follow the player's bindings.
import { launch, open, menu } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const CENSUS = fileURLToPath(new URL('./lib/textcensus.js', import.meta.url));
const HUD = process.env.HUD || 'lba', OUT = process.env.OUT, TAG = process.env.TAG || 'run', MEASURE = !!process.env.MEASURE;
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (name, ok, info) => { if (MEASURE) return; if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : JSON.stringify(info)?.slice(0, 700)); };
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const results = {};
// the CSS transitions/animations run on real time: the census and the shots read their end state
const still = () => page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
const boot = async () => {
  await open(page, '?nocine');
  await ev((hud) => { game.settings.hud = hud; game.applySettings(); }, HUD);
  await page.addScriptTag({ path: CENSUS });   // (before New: the hand-off's texts come up as the game starts)
  await still();
  await menu(page, 'new');
};
const moment = async (route, name) => {
  await ev(() => { game.renderer.render(); });
  const c = await ev(() => C.now());
  (results[route].moments ||= []).push({ name, n: c.n, chars: c.chars, items: c.items.filter((i) => i.kind !== 'counter').map((i) => `${i.kind}: ${i.text}`), dialog: c.dialog ? c.dialog.slice(0, 60) : '' });
  console.log(`  [${route}/${name}] ${c.n} text item(s), ${c.chars} chars${c.dialog ? ' + dialogue' : ''}: ${c.items.filter((i) => i.kind !== 'counter').map((i) => `${i.kind}: "${i.text}"`).join(' | ')}`);
  if (OUT) await page.screenshot({ path: `${OUT}/${TAG}-${HUD}-${route}-${name}.jpg`, type: 'jpeg', quality: 70, timeout: 180000 });
  return c;
};
const route = async (name, fn) => {
  results[name] = {};
  await ev(() => C.clear());
  await fn();
  const s = await ev(() => C.sum());
  results[name].sum = s;
  const log = await ev(() => C.log.filter((e) => e.kind !== 'float').map((e) => `${e.t.toFixed(1)} ${e.kind}: ${e.text}`));
  results[name].log = log;
  console.log(`ROUTE ${name}: ${s.n} HUD texts put up, ${s.chars} chars (${Object.entries(s.by).map(([k, v]) => `${k} ${v.n}/${v.chars}`).join(', ')}); dialogue ${s.lines} lines ${s.lineChars} chars`);
  for (const l of log) console.log('    ' + l);
};
const step = (label, fn, arg) => ev(fn, arg).then((r) => { if (r?.fail) console.log(`  STEP ${label}: ${r.fail}`); return r; });

// ---------------------------------------------------------------- 1. the hand-off and the prologue's first minutes
await boot();
await route('prologue', async () => {
  // (the opening ends in the house with control: ?nocine is that end state, afterOpening)
  await ev(() => { game.step(0.4); });
  const h0 = await moment('prologue', '01-handoff');
  await step('settle', () => P.settle());
  await step('cupboard', () => { const s = game.room.searches[0]; const r = P.use(s.x, s.z); return { ...r, fail: game.hero.hasBall ? null : 'no ball' }; });
  const cup = await moment('prologue', '02-cupboard');
  await step('out', () => { const e = game.room.exits.find((x) => !x.room); return P.through(e.x, e.z); });
  await ev(() => game.step(0.5));
  const out = await moment('prologue', '03-outside');
  // the walk to the well: prompts as he passes people and signs
  await step('to the well', () => { const w = game.world.well; P.go(w.x - 2.2, w.z, { run: true, tol: 0.8 }); P.face(w.x, w.z); game.step(0.3); });
  await moment('prologue', '04-at-well');
  await step('well', () => { const w = game.world.well; return P.use(w.x, w.z, { near: 2.0, run: true }); });
  await step('gilbert', () => P.talk('gilbert', { run: true }));
  const key = await moment('prologue', '05-key');
  await step('xil', () => P.talk('xil', { run: true }));
  await step('doran', () => P.talk('doran', { run: true }));
  await step('xil rope', () => P.talk('xil', { run: true }));
  await moment('prologue', '06-rope');
  results.prologue.handoff = h0; results.prologue.cupboard = cup; results.prologue.outside = out; results.prologue.key = key;
});
const P1 = results.prologue;
check('hand-off: the first goal is on screen, once (not as a toast repeating it)', P1.handoff.items.filter((i) => /well/i.test(i.text)).length === 1, P1.handoff.items);
check('hand-off: no weapon pill ("Fists") for a weapon he already had', !P1.handoff.items.some((i) => i.kind === 'weapon'), P1.handoff.items);
check('out of the house: at most 2 text items on screen', P1.outside.n <= 2, P1.outside.items);
check('the cupboard: the ball and holomap toast names the player\'s keys (not a fixed F/M)', (await ev(() => { const k = (a) => game.input.label(a); return C.log.some((e) => e.kind === 'toast' && e.text.includes(k('ball')) && e.text.includes(k('map'))); })), P1.log);
check('prologue route: the objective is not repeated by a toast', !P1.log.some((l) => /toast: Check the well/.test(l)), P1.log);

// ---------------------------------------------------------------- 2. the street (Citadel, house → harbour)
await route('street', async () => {
  await step('to the square', () => { const V = game.world.well; P.go(V.x + 4, V.z - 6, { run: true, tol: 1.2 }); });
  await moment('street', '01-square');
  await step('to the harbour', () => P.go(-104, 36, { run: true, tol: 1.5 }));
  await moment('street', '02-harbour');
});

// ---------------------------------------------------------------- 3. combat: the mites in the well (the ball)
await route('combat', async () => {
  await step('tim', () => P.talk('tim', { run: true }));
  await step('overhear', () => { P.tap('F4'); const t = P.npc('tim'); P.go(t.pos.x + 6, t.pos.z, { tol: 1 }); P.settle(); P.go(t.pos.x, t.pos.z, { tol: 3 }); P.settle(); P.tap('F1'); return { overheard: game.flags.overheard }; });
  await step('confess', () => P.talk('tim'));
  await step('down', () => { const w = game.world.well; return P.use(w.x, w.z, { near: 2.0, run: true }); });
  await ev(() => P.settle());
  await moment('combat', '01-cave');
  // walk at the first mite and throw: the moment the fight starts
  await step('fight', () => {
    const G = game, m = G.enemies.find((e) => e.alive && e.present);
    if (!m) return { fail: 'no mite' };
    P.go(m.pos.x - 4, m.pos.z, { tol: 0.8, fight: false }); P.face(m.pos.x, m.pos.z); P.tap('KeyF', 0.05); G.step(0.5);
    return { hp: G.hero.hp };
  });
  await moment('combat', '02-fight');
  await step('fight on', () => P.fight({ maxT: 40, minHp: 3 }));
  await moment('combat', '03-after');
});

// ---------------------------------------------------------------- 4. chapter 4: Kesh's wind-pump (ADV-2)
await route('chapter4', async () => {
  await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
    G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle(); });
  await ev(() => { const G = game; Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true });
    G.story.cur.toShell(); P.settle(); G.step(1.5); P.settle(); });
  await ev(() => game.step(0.3));
  await moment('chapter4', '01-arrive');
  await step('tarra', () => P.talk('tarra', { run: true }));
  await moment('chapter4', '02-tarra');
  await step('brosk', () => P.talk('dtrader', { run: true }));
  await step('sani', () => P.talk('dkid', { run: true }));
  await step('listen', () => { const pu = game.rooms.desert.pump; return P.use(pu.x - 2.7, pu.z + 0.3, { kind: 'c4listen', run: true }); });
  await ev(() => { const pu = game.rooms.desert.pump; P.go(pu.x - 5, pu.z, { tol: 0.5 }); P.face(pu.x, pu.z); pu.gustNow(); game.step(0.45); });
  await moment('chapter4', '03-gust');
  // the jammed gear (index 1), thrown at from in front of it as chapter4.mjs does
  await step('gear', () => {
    const G = game, g = G.rooms.desert.pump.gears[1], h = G.hero, want = G.room.ballTargets.find((t) => t.gear === 1);
    const aimed = () => G.targeting?.throwTarget?.({ x: Math.sin(h.angle), z: Math.cos(h.angle) });
    for (let k = 0; k < 5 && !G.flags.c4_gear1; k++) {
      const r = [4.2, 5.0, 3.6, 5.6, 4.6][k];
      P.go(g.x + g.nx * r, g.z + g.nz * r, { tol: 0.35, maxT: 40 }); P.settle();
      for (let w = 0; w < 120 && G.ball.state !== 'idle'; w++) G.step(1 / 30);
      if (h.behaviour !== 'normal') P.tap('F1');
      P.face(g.x, g.z);
      for (let n = 0; n < 24 && aimed() !== want; n++) { const a = aimed(), da = a ? Math.atan2(a.x - h.pos.x, a.z - h.pos.z) - Math.atan2(g.x - h.pos.x, g.z - h.pos.z) : 0; P.tap(Math.sin(da) > 0 ? 'ArrowRight' : 'ArrowLeft', 0); }
      P.tap('KeyF', 0.05); G.step(1.6); P.settle();
    }
    return { gear: !!G.flags.c4_gear1, fail: G.flags.c4_gear1 ? null : 'gear not freed' };
  });
  await ev(() => { const J = game.rooms.desert.pump.joint; P.go(J.x - 2.4, J.z + 2.2, { tol: 0.5 }); P.face(J.x, J.z); game.step(0.5); });
  await moment('chapter4', '04-leak');
});

// ---------------------------------------------------------------- 5. the core fight (chapter 11): the nudge is for a stuck player only
await route('core', async () => {
  await ev(() => { const G = game, f = G.flags; P.settle();
    Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'shell', c3_started: true, c3_diagram: true, c3_ladder: true, c3_cooled: true, c3_pillar0: true, c3_pillar1: true, c3_pillar2: true, c3_sendell: true });
    f.chapter = G.story.chapters.findIndex((c) => c.key === 'shell'); G.hero.hasBall = true; G.story.refreshCast(); G.updateObjective();
    G.enterRoom('c3core', null, true); for (let i = 0; i < 90 && !f.c3_fight; i++) { G.step(1 / 30); if (G.state !== 'play') P.settle(); } P.settle(); G.step(0.3); });
  const f0 = await moment('core', '01-fight');
  // he stands about and does nothing for 45 s of play (kept on his feet): the stuck player's nudge comes up
  const n = await ev(() => { const G = game, h = G.hero; let at = null;
    for (let i = 0; i < 45 * 15 && at == null; i++) { h.hp = h.maxHp; G.step(1 / 15); if (G.state !== 'play') P.settle(); if ((G.hud.toastLog || []).some((m) => /glowing plate/.test(m))) at = +G.time.toFixed(1); }
    return { at, pylons: G.story.cur.pylons() }; });
  const f1 = await moment('core', '02-stuck');
  results.core.fight = f0; results.core.nudge = n; results.core.stuck = f1;
});

const goalOnly = (m) => m.items.every((i) => !/^objective: .*◆/.test(i));
const allMoments = Object.values(results).flatMap((r) => r.moments || []);
check('the objective panel names the goal only; its steps wait in the pause menu, the Holomap and the journal', allMoments.every(goalOnly), allMoments.filter((m) => !goalOnly(m)));
const C5 = results.core;
check('core fight: no instruction toast as it starts (Baldino\'s radio said how)', !C5.fight.items.some((i) => i.kind === 'toast'), C5.fight.items);
check('core fight: a player stuck for 40 s of play gets one nudge', C5.nudge.at != null && C5.nudge.pylons === 0, C5.nudge);
check('no area-name toast after travel, no "Game saved" toast at checkpoints', !Object.values(results).some((r) => (r.log || []).some((l) => /toast: (Game saved|Desert Island:|Citadel Island:|Zeelich Spaceport)/.test(l))), Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.log])));

// ---------------------------------------------------------------- the objective on demand
const od = await ev(() => { const o = document.querySelector('#pause-objective'); return { pause: o.textContent.trim(), holo: document.querySelector('#holomap .objective').textContent.trim() }; });
check('the objective is kept for the pause menu and the Holomap', od.pause.length > 0 && od.holo.length > 0, od);
if (HUD === 'modern') {
  const gone = await ev(() => { game.step(12); game.renderer.render(); return C.now().items.filter((i) => i.kind === 'objective').length; });
  check('modern HUD: the objective panel steps aside after it was shown', gone === 0, gone);
}

// ---------------------------------------------------------------- summary
console.log('\nSUMMARY (' + TAG + ', HUD ' + HUD + ')');
for (const [r, v] of Object.entries(results)) {
  const m = (v.moments || []).map((x) => `${x.name} ${x.n}/${x.chars}`).join(' · ');
  console.log(`  ${r.padEnd(9)} put up ${String(v.sum.n).padStart(3)} texts ${String(v.sum.chars).padStart(5)} chars | dialogue ${v.sum.lines} lines | on screen (items/chars): ${m}`);
}
if (OUT) fs.writeFileSync(`${OUT}/${TAG}-${HUD}.json`, JSON.stringify(results, null, 1));
console.log(errs.length ? errs.slice(0, 10).join('\n') : 'no errors');
if (!MEASURE) console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
