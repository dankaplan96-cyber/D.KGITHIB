// EXP-1: chapter 10 of the expanded campaign, "Borrowed Time" (key 'throttle', story/throttle.js), from a chapter-9 save
// to the next chapter's start, by input wherever it is a player's step (tests/lib/player.js: keys, the game's own time
// step, A* over its collision). Team-only content (docs/lba-maturity/EXP-PLAN-2.md).
//   a chapter-9 save on Mill Lane with Baldino's isolator in hand → the isolator clipped on Kell's feed box (chapter 9's
//   last step) → the card "Chapter 10 · Borrowed Time" → Mira's call → the ship home (?nocine: no film) → the Water
//   Office → the valve room: a wheel between kicks kicks back (the wrong attempt), three bleeds in the kicks → Oren
//   → Save & quit → Continue mid-hammer (the bleeds kept) → the fortress shelter: Gilbert's thanks, his washroom, Zoé on
//   the relay → played as Zoé in the project office: the guard, the register, crates 212/1 and 212/2, the stack (look,
//   turn the bottom crate, open it): the B-7 and Vesk's tag → Save → Continue as Zoé (her finds kept) → out and to the
//   shelter → Twinsen again → the flange opened with the feed on sprays him back (the wrong attempt) → the feed shut,
//   the B-7 fitted, the feed opened, the band turned to green → Oren swings the lever shut → a hand holds it → Gilbert
//   takes it, Vesk on the wire, Baldino's call asks where the B-7 came from: Zoé's return label (Tessa's Float Repairs,
//   Ballastra; EXP-2) → the next chapter of the campaign (chapter 11, Ballastra) at Citadel Spaceport by the freighter.
// Also: the base campaign (a save that reached the network before the expansion) never builds the branch nor shows the
// governor; the cost at the shelter (draw calls with the branch shown and hidden; SwiftShader: counts only).
// Times are the bot's game time: a floor, not a first-time estimate.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
let played = 0;
const timed = async (f, a) => { const t0 = await ev(() => game.time); const r = await ev(f, a); played += (await ev(() => game.time)) - t0; return r; };

// chapter 9 played up to its last step: the vote, the stop thrown, the isolator tried on the bench (CAMPAIGN-7, cnline.js)
const UP_TO_LANE = { prologueDone: true, intro: true, c1_started: true, c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
  c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_home: true, c8_gilbert: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_pippa: true, c8_zoeDone: true, c8_done: true,
  c9_started: true, c9_form: true, c9_nara: true, c9_oku: true, c9_clerk: true, c9_heard: true, c9_plans: true, c9_vote: true, ml_2: true, ml_3: true,
  cn_v: 1, cn_closed: true, cn_kell: true, cn_log: true, cn_stop: true, cn_isoGot: true, cn_isoA: true, cn_isoB: true, cn_iso: true, exp: 1 };
const helpers = () => ev(() => {
  const G = game;
  window.__said = []; const say0 = G.say.bind(G);
  G.say = (name, text, cb, sp, col) => { window.__said.push((name ? name + ': ' : '') + (Array.isArray(text) ? text.join(' ') : text)); return say0(name, text, cb, sp, col); };
  window.__cards = []; const H = G.hud, cc = H.chapterCard.bind(H); H.chapterCard = (a, b) => { window.__cards.push((a ? a + ' · ' : '') + b); return cc(a, b); };
  const TH = () => G.story.chapters.find((c) => c.key === 'throttle');
  window.T = {
    th: TH,
    obj: () => document.querySelector('#pause-objective')?.textContent || '',
    said: (n) => window.__said.slice(-n),
    view: () => {
      const f = G.flags, ch = TH();
      return { key: f.chapterKey, n: G.story.number(f.chapterKey) ?? null, room: G.room?.id ?? 'citadel', state: G.state, body: G.hero.body || 'twinsen',
        og: [!!f.og_started, !!f.og_arrived, !!f.og_room, f.og_bleed | 0, !!f.og_steady, !!f.og_thanks],
        th: { zoeGo: !!f.th_zoeGo, reg: !!f.th_reg, cB: f.th_cB | 0, b7: !!f.th_b7, zoeDone: !!f.th_zoeDone, shut: !!f.th_feedShut, fitted: !!f.th_fitted, band: f.th_band ?? null, set: !!f.th_set, push: !!f.th_push, lever: !!f.th_lever, vesk: !!f.th_vesk, done: !!f.th_done },
        hammer: ch.hammering(), needle: ch.needle != null ? +ch.needle.toFixed(2) : null, branch: !!ch.branch, b7shown: !!ch.branch?.b7.visible,
        obj: T.obj(), journal: G.story.journal().map((c) => c.title), cards: [...window.__cards] };
    },
    // stand at valve i, facing it, and press E at a moment of the hammer's cycle ('kick': the turn lands in the kick)
    wheel(i, when) {
      const V = G.rooms.valves, v = V.valves[i], ch = TH();
      P.go(v.x, v.z + 0.65, { tol: 0.3 }); P.face(v.x, v.z);
      for (let k = 0; k < 600; k++) { const p = ch.phase(); if (when === 'kick' ? p > 0.92 && p < 0.985 : p > 0.5 && p < 0.6) break; G.step(1 / 60); }
      const b0 = G.flags.og_bleed | 0, x0 = G.hero.pos.x, z0 = G.hero.pos.z, hp0 = G.hero.hp, n0 = window.__said.length;
      P.tap('KeyE', 0.05); G.step(0.9);
      const moved = +Math.hypot(G.hero.pos.x - x0, G.hero.pos.z - z0).toFixed(2);
      P.settle();
      return { before: b0, bleed: G.flags.og_bleed | 0, moved, hpLost: hp0 - G.hero.hp, said: window.__said.slice(n0) };
    },
    // a step at the branch or in the office: walk to the spot, E on the expected thing
    use(p, kind, near = 0.7) { const n0 = window.__said.length; const r = P.use(p.x, p.z, { kind, near }); for (let i = 0; i < 12; i++) G.step(0.1); P.settle(); return { r: r.r, kind: r.target?.kind ?? null, said: window.__said.slice(n0) }; },
    draws() { const R = G.renderer.renderer; let main = 0, shadow = 0; const o = R.renderBufferDirect.bind(R); R.renderBufferDirect = (cam, scene, ...a) => { if (scene) main++; else shadow++; return o(cam, scene, ...a); }; G.perf.beginFrame(); G.frame(1 / 30, true); R.renderBufferDirect = o; return { main, shadow }; },
  };
});
const reload = async () => { await open(page, '?nocine'); await helpers(); await page.click('#btn-continue'); await ev(() => { game.step(0.05); P.settle(); for (let i = 0; i < 10; i++) game.step(0.1); P.settle(); }); };
// Save & Quit from the pause menu as a player does it (Esc, the menu's button), then Continue on the title
const saveQuit = async () => {
  await ev(() => { P.tap('Escape'); game.step(0.1); });
  await page.click('#pause [data-act="quit"]', { timeout: 60000 }).catch(async () => { await ev(() => game.act('quit')); });
  await page.waitForEvent('load', { timeout: 20000 }).catch(() => {});   // (Quit's own reload lands first: a slow machine took longer than 1.5 s)
  await page.waitForTimeout(1500);
  await reload();
};

// ---------------------------------------------------------------- a chapter-9 save on Mill Lane, the last step of chapter 9
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
await ev((F) => {
  const G = game; P.settle();
  Object.assign(G.flags, F, { chapter: 8, chapterKey: 'council' }); delete G.flags.exp_base; G.hero.hasBall = true;
  G.enterRoom('zeelich', null, true); G.story.applyFlags(); G.step(0.5); P.settle();
  G.save(false);
}, UP_TO_LANE);
await reload();
const s0 = await timed(() => {
  const G = game, L = G.rooms.zeelich.lift, a = T.view();
  const r = P.use(L.isoAt.x, L.isoAt.z, { kind: 'cn_clip', near: 0.6, run: true });
  for (let i = 0; i < 400 && G.flags.chapterKey === 'council'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  P.settle(); for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  return { before: a.key, r: r.r, lane: !!G.flags.cn_lane, ...T.view(), said: window.__said.slice(0, 40) };
});
console.log('chapter 9 → 10:', JSON.stringify(s0));
check('a chapter-9 save loads on Zeelich; the isolator clipped on Kell\'s feed by input ends chapter 9', s0.before === 'council' && s0.r !== 'timeout' && s0.lane, { before: s0.before, r: s0.r, lane: s0.lane });
check('chapter 10 "Borrowed Time" follows in the expanded campaign (its card), numbered 10', s0.key === 'throttle' && s0.n === 10 && s0.cards.some((c) => /Chapter 10 · Borrowed Time/.test(c)), { key: s0.key, n: s0.n, cards: s0.cards });
check("Mira's call: since the stop the mains hammer the shelters; the ship takes him home (no film under ?nocine)", s0.said.some((l) => /The mains under town are hammering/.test(l)) && s0.room === 'citadel' && s0.og[1] && s0.state === 'play', { room: s0.room, og: s0.og });
check('the objective sends him to Mira at the Water Office; the journal has "10. Borrowed Time"', /Water Office/.test(s0.obj) && s0.journal.includes('10. Borrowed Time'), { obj: s0.obj, j: s0.journal });

// ---------------------------------------------------------------- the valve room
const s1 = await timed(() => { const r = P.talk('mira', { run: true }); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { r: r.r, ...T.view() }; });
check("walked to the Water Office; Mira takes him down to FunFrock's valve room; the hammer runs", s1.r === 'talked' && s1.room === 'valves' && s1.og[2] && s1.hammer === true && /Ease the hammer/.test(s1.obj), s1);
const early = await timed(() => T.wheel(0, 'still'));
check('the wrong attempt: a wheel opened between kicks kicks back (pushed off, no harm, no bleed)', early.bleed === 0 && early.moved > 0.25 && early.hpLost === 0 && early.said.some((l) => /Wait for the kick/.test(l)), early);
const b1 = await timed(() => T.wheel(1, 'kick'));
check('a wheel opened as it kicks bleeds the kick (1/3)', b1.bleed === 1, b1);
await saveQuit();
const r1 = await ev(() => T.view());
check('Save & quit → Continue mid-hammer: the valve room, chapter 10, the bleed kept, the hammer running', r1.key === 'throttle' && r1.room === 'valves' && r1.og[3] === 1 && r1.hammer === true && r1.state === 'play', r1);
const b23 = await timed(() => { T.wheel(2, 'kick'); T.wheel(3, 'kick'); for (let i = 0; i < 60; i++) game.step(0.05); P.settle(); return { ...T.view(), wheel4: game.rooms.valves.valves[3].open, said: window.__said.slice(-20) }; });
check('the third bleed: Oren speaks through the governor (Ballastra; the kicks strike an old stone there; the shelters counted by weight)', b23.og[4] && b23.said.some((l) => /On Ballastra\. Something under your town strikes an old stone/.test(l)) && b23.said.some((l) => /Sixty-one people/.test(l)), b23.said);
check('wheel IV turns itself back ("Green holds"); the needles on green; the plate named (Balance Works)', b23.wheel4 === false && Math.abs(b23.needle - 2) < 0.15 && b23.said.some((l) => /Balance Works, Ballastra/.test(l)), { wheel4: b23.wheel4, needle: b23.needle });

// ---------------------------------------------------------------- the shelter → Zoé
const s3 = await timed(() => {
  P.exitTo('valves-out'); P.exitTo('outdoor-office'); P.go(-33.3, -36.4, { tol: 1.2, run: true });
  const t = P.talk('gilbert', { run: true }); P.settle(); for (let i = 0; i < 40; i++) game.step(0.1); P.settle();
  return { t: t.r, ...T.view(), said: window.__said.slice(-14) };
});
console.log('the shelter → Zoé:', JSON.stringify(s3));
check("Gilbert thanks him and Oren; the washroom stays shut; Zoé on the relay knows Balance Works from the project's register", s3.og[5] && s3.said.some((l) => /Oren, if you can hear this/.test(l)) && s3.said.some((l) => /delivery register/.test(l)), s3.said);
check('played as Zoé in the project office; the guard who never saw her; the objective is the register', s3.body === 'zoe' && s3.room === 'projoffice' && s3.th.zoeGo && s3.said.some((l) => /never saw you/.test(l)) && /register/.test(s3.obj), { body: s3.body, room: s3.room, obj: s3.obj });

const z1 = await timed(() => {
  const ch = T.th(), reg = ch.officeAt([-5.55, -3.3]);
  const a = T.use(reg, 'threg', 0.7);
  const A = T.use(ch.officeAt([-0.05, -3.8]), 'thcrate', 0.75), C = T.use(ch.officeAt([-5.3, -1.95]), 'thcrate', 0.75);
  return { a, A, C, ...T.view() };
});
check('the register names crate 212/3 and says "returned"; the objective is the crate', z1.th.reg && z1.a.said.some((l) => /crate 212\/3/.test(l)) && /212\/3/.test(z1.obj), { a: z1.a, obj: z1.obj });
check('the first two crates read 212/1 and 212/2', z1.A.said.some((l) => /212\/1/.test(l)) && z1.C.said.some((l) => /212\/2/.test(l)), { A: z1.A.said, C: z1.C.said });
await ev(() => game.save(false));
await reload();
const r2 = await ev(() => { P.settle(); for (let i = 0; i < 10; i++) game.step(0.1); return T.view(); });
check('Save → Continue during Zoé\'s part: Zoé again, in the project office, the register read', r2.key === 'throttle' && r2.body === 'zoe' && r2.room === 'projoffice' && r2.th.reg && !r2.th.b7, r2);
const z2 = await timed(() => {
  const ch = T.th(), B = ch.officeAt([3.4, -2.6]);
  const look = T.use(B, 'thcrate', 0.75), turn = T.use(B, 'thcrate', 0.75), open = T.use(B, 'thcrate', 0.75);
  return { look, turn, open, ...T.view() };
});
check('the stack: the bottom crate turned to the wall; turned round, 212/3; opened: the B-7 and Vesk\'s tag (do not fit, log as returned)', z2.look.said.some((l) => /turned to the wall/.test(l)) && z2.turn.said.some((l) => /212\/3/.test(l)) && z2.open.said.some((l) => /Do not fit\. Log as returned/.test(l)) && z2.th.b7, { look: z2.look.said, turn: z2.turn.said, open: z2.open.said });
const z3 = await timed(() => {
  P.exitTo('outdoor-projoffice'); P.settle();
  const ch = T.th(), p = ch.front(1.2, -0.9);
  const r = P.go(p.x, p.z, { tol: 1.5, run: true }); for (let i = 0; i < 30; i++) { game.step(0.1); if (game.state === 'dialog') P.settle(); } P.settle();
  return { r: r.r, ...T.view(), said: window.__said.slice(-4) };
});
console.log('Zoé to the shelter:', JSON.stringify(z3));
check('Zoé walks the B-7 to the fortress shelter; Twinsen again there, and she hands it over', z3.body === 'twinsen' && z3.th.zoeDone && z3.room === 'citadel' && z3.said.some((l) => /It was by the door/.test(l)) && /Fit the B-7/.test(z3.obj), z3);

// ---------------------------------------------------------------- the branch
const w1 = await timed(() => { const ch = T.th(); return { ...T.use(ch.front(), 'thflange'), fitted: !!game.flags.th_fitted }; });
check('the wrong attempt: the flange opened with the feed on sprays him back; nothing fitted', !w1.fitted && w1.said.some((l) => /Feed first/.test(l)), w1);
const w2 = await timed(() => {
  const ch = T.th();
  const feed = T.use(ch.front(0.55, -0.22), 'thfeed'), fit = T.use(ch.front(), 'thflange'), open = T.use(ch.front(0.55, -0.22), 'thfeed');
  const weep = !!ch.branchState().weep;
  return { feed, fit, open, weep, ...T.view() };
});
check('the feed shut, the B-7 fitted, the feed opened: too much from the box (the old joint weeps, Gilbert says so)', w2.th.fitted && !w2.th.shut && w2.b7shown && w2.weep && w2.open.said.some((l) => /weeping/.test(l)), { th: w2.th, weep: w2.weep });
const w3 = await timed(() => {
  const ch = T.th(), log = [];
  for (let k = 0; k < 6 && !game.flags.th_set; k++) { const r = T.use(ch.front(), 'thband'); log.push([game.flags.th_band, r.said.join(' | ')]); }
  for (let i = 0; i < 20; i++) game.step(0.1);
  return { log, needle: +ch.branch.need.toFixed(2), ...T.view() };
});
check('the band turned a notch at a time until the gauge reads green (Gilbert: water, and no bang)', w3.th.set && w3.th.band === 3 && Math.abs(w3.needle - 2) < 0.3 && w3.log.some((l) => /no bang/.test(l[1])), w3);
const w4 = await timed(() => { for (let i = 0; i < 60; i++) { game.step(0.1); if (game.state === 'dialog') P.settle(); } P.settle(); for (let i = 0; i < 40; i++) game.step(0.1); P.settle(); const ch = T.th(); return { lever: +ch.branch.leverA.toFixed(2), flow: +ch.branch.flow.toFixed(2), ...T.view(), said: window.__said.slice(-3) }; });
check('Oren tries the lever ("That part has a lever."): it swings shut and the water stops; the objective: hold it', w4.th.push && w4.lever > 0.9 && w4.flow < 0.2 && /Hold the B-7/.test(w4.obj), { lever: w4.lever, flow: w4.flow, obj: w4.obj });
const w5 = await timed(() => {
  const ch = T.th(), r = T.use(ch.front(), 'thhold');
  for (let i = 0; i < 600 && game.flags.chapterKey === 'throttle'; i++) { game.step(0.1); if (game.state === 'dialog') P.settle(); }
  P.settle(); for (let i = 0; i < 30; i++) game.step(0.1); P.settle();
  return { r, ...T.view(), said: window.__said.slice(-30) };
});
console.log('the end:', JSON.stringify(w5));
check('a hand on the lever: Oren lets go; Gilbert takes it ("A hand gets tired. I do not.")', w5.said.some((l) => /I do not push against a hand/.test(l)) && w5.said.some((l) => /A hand gets tired/.test(l)), w5.said);
check('Vesk on the wire gives his reason (a station that can say no will say no); Zoé answers him', w5.said.some((l) => /will say no/.test(l)) && w5.said.some((l) => /turn their own water on/.test(l)), w5.said);
check("Baldino's call ends chapter 10: the B-7's return label (Tessa's Float Repairs, Ballastra); chapter 11 begins at Citadel Spaceport (EXP-2)", w5.key === 'ballastra' && w5.n === 11 && w5.room === 'citadel' && w5.cards.some((c) => /Chapter 11 · Ballastra/.test(c)) && w5.said.some((l) => /TESSA'S FLOAT REPAIRS/.test(l)), { key: w5.key, n: w5.n, room: w5.room, cards: w5.cards });
const j = await ev(() => game.story.journal().find((c) => /Borrowed Time/.test(c.title))?.lines.map((l) => l.key));
check('the journal keeps chapter 10\'s seven lines', Array.isArray(j) && j.length === 7, j);
console.log(`chapter 10 bot game time, chapter 9's last step to chapter 11's start: ${played.toFixed(0)} s (${(played / 60).toFixed(1)} min; a floor: the bot walks A* routes and reads every line at once)`);

// ---------------------------------------------------------------- after: the shelter remembers; the cost
const after = await ev(() => { const ch = T.th(); return { branch: !!ch.branch, b7: !!ch.branch?.b7.visible, lever: +(ch.branch?.leverA ?? -1).toFixed(2), on: ch.branch?.grp.visible }; });
check('in the next chapter the B-7 is still on the shelter\'s branch, its lever open', after.branch && after.b7 && after.lever === 0 && after.on, after);
const cost = await ev(() => {
  const G = game, ch = T.th(), p = ch.front(2.6, 0);
  G.exitRoom({ x: p.x, z: p.z, a: Math.PI + 0.3 }, true); for (let i = 0; i < 10; i++) G.step(0.1);
  const on = T.draws(); ch.branch.grp.visible = false; const off = T.draws(); ch.branch.grp.visible = true;
  return { on, off };
});
console.log('at the shelter (branch shown / hidden):', JSON.stringify(cost));
check('the cost at the shelter: at most 20 more draw calls (main + shadow) with the branch and the B-7 shown', (cost.on.main + cost.on.shadow) - (cost.off.main + cost.off.shadow) <= 20, cost);

// ---------------------------------------------------------------- the base campaign never builds it
await ev(() => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 5, at: Date.now(), room: null, hero: { x: -36, z: -10, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { prologueDone: true, intro: true, c9_vote: true, chapter: 9, chapterKey: 'network', c10_started: true }, killed: [], collected: [], searched: [], crates: [], loot: [] })); });
await reload();
const base = await ev(() => { const G = game, ch = T.th(); return { base: G.flags.exp_base ?? null, key: G.flags.chapterKey, n: G.story.number(G.flags.chapterKey), branch: !!ch.branch, gov: ch.gov?.visible ?? 'none' }; });
check('a format-5 save in the network goes on as the base game (network numbered 10); no branch built, no governor', base.base === 1 && base.key === 'network' && base.n === 10 && !base.branch && base.gov !== true, base);

done();
await browser.close();
