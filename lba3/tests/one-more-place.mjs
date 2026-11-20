// U-2 "One More Place" (the user's side quest; src/game/story/oneplace.js, src/game/oneplace.js;
// docs/lba-maturity/U2-ONE-MORE-PLACE.md). Played by input where it says INPUT (the harness's arrow keys, E and the pause
// menu: tests/lib/player.js):
//   - chapter 2 at home (the chapter set by its flags up to the pump thread's last step): before the hot water runs in
//     the house the table has its three chairs and Zoé's talk is the chapter's own; once it runs, a fourth chair and four
//     bowls; the chair looked at; Zoé's story of Old Brix (and Arthur's word: the lane's benches);
//   - out on the lane: Brix found on his round and asked; he brings his radio and stays on his bench while seen; at home
//     he is at the table (the street's Brix gone meanwhile); Save & quit → Continue keeps it;
//   - his radio's rule heard (the wheel, the green eye, the house's tune); the sound muted (the master volume at 0): the
//     tuning by the visible cues only (the needle, the eye's glow, the radio's caption): a wrong station first (Brix's
//     word, nothing lost), let go half way (the needle kept), then the house's tune found; the room's music is the
//     house's own again ('home');
//   - "Sit down": E at Twinsen's chair: the meal's scene with its lines; life refilled; the chair stays, Brix goes home,
//     back on his round; his word on the lane; Arthur's line about the eye in chapter 2's radio scene;
//   - later chapters (set by their flags, ISO): chapter 4 and chapter 9, home through the front door by input: the table
//     laid and Brix at it, a meal with that chapter's own conversation; out of the garden and back: another meal, music
//     and food only; chapter 10 (Zoé in the lighthouse): no meal;
//   - old saves from before this change (fixtures base-04 and new-04, chapter 2; base-12, chapter 9) load: no dx_om_
//     state made up; the table as their chapter has it.
// SHOTS=dir writes jpg pictures (deviceScaleFactor 1). SwiftShader, headless: Automated runtime only.
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
const shot = async (n, step = true) => { if (!SHOTS) return; await ev((s) => { if (s) game.step(0.3); game.renderer.render(); }, step); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 72, timeout: 240000 }); };
const said = () => ev(() => { const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(() => {
  if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; }
  window.O = () => game.story.oneplace;
  window.OP = () => game.story.oneplace.OP;
  window.om = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('dx_om_')));
  window.npcAt = (id) => { const n = P.npc(id); return n ? { present: n.present, x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2), y: +n.pos.y.toFixed(2), anim: n.rig.anim } : null; };
  window.table = () => { const S = OP()?.state; return S ? { chair: S.chair, bowls: S.bowls, radio: S.radio, eye: +S.eye.toFixed(2), needle: +S.needle.toFixed(3) } : null; };
  window.BASE ??= JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    const keep = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('dx_')));
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_started: true, c1_home: true, c1_water: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true, c2_shield: true }, keep, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
  // in front of the house's door outside, then in through it by input
  window.homeDoor = () => { const G = game, h = G.world.houses[0]; if (G.room) G.exitRoom({ x: h.door.x + Math.sin(h.ry) * 2.2, z: h.door.z + Math.cos(h.ry) * 2.2, a: h.ry + Math.PI }, true, true); G.step(0.4); P.settle(); return P.enter('house').r; };
  // the tuning by the visible cues alone: hold the key until the eye opens wide and the caption changes
  window.tuneTo = (key, want, maxT = 40) => { const G = game, o = O(), out = { t: 0 }; G.input.keys.add(key); while (out.t < maxT && o.tune) { G.step(0.05); out.t += 0.05; const cap = document.querySelector('#omtune .omcap')?.textContent || ''; if (OP().state.eye > 0.99 && want.test(cap)) break; } G.input.keys.delete(key); G.step(0.05); out.cap = document.querySelector('#omtune .omcap')?.textContent; out.eye = +OP().state.eye.toFixed(2); out.needle = +OP().state.needle.toFixed(3); return out; };
  // a meal's scene to its end, its subtitles as they show
  window.film = (maxT = 80) => { const out = { t: 0, subs: [] }; while (game.cine && out.t < maxT) { game.step(0.1); out.t += 0.1; const el = document.querySelector('#cine-sub'); if (el?.classList.contains('show')) { const s = el.textContent; if (out.subs[out.subs.length - 1] !== s) out.subs.push(s); } } P.settle(); return out; };
  window.sitDown = () => { const G = game, S = OP().seats.hero; P.go(S.x + 0.55, S.z + 0.7, { tol: 0.3, maxT: 30 }); P.face(S.x, S.z); const tg = P.target()?.kind; P.tap('KeyE', 0.1); for (let i = 0; i < 40 && !G.cine; i++) G.step(0.1); return { tg, cine: !!G.cine }; };
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
await ev(() => { P.settle(); });
await helpers();
// ---------------------------------------------------------------- chapter 2: the table before and after the hot water
iso('chapter 2 by its flags: home told, the valves open, the pump thread done up to the taps running (ct_bypass), not yet heard by Zoé');
const a0 = await ev(() => {
  const G = game, f = G.flags;
  Object.assign(f, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_home: true, c1_arrived: true, c1_task: true, c1_water: true, ct_v: 1, ct_dry: true, ct_worker: true, ct_bypass: true, ct_strip: true, ct_plate: true, ct_tapShut: true });
  G.hero.hasBall = true; G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle(); G.updateObjective();
  const e = homeDoor(); G.step(0.5);
  return { e, room: G.room?.id, table: table(), om: om() };
});
await said();
check('chapter 2, the taps not yet heard by Zoé: the table has its three chairs, no bowls; no dx_om_ state', a0.room === 'house' && a0.table && !a0.table.chair && !a0.table.bowls && Object.keys(a0.om).length === 0, a0);
const a1 = await ev(() => { const r = P.talk('zoe'); game.step(0.6); return { r: r.r, ctHome: !!game.flags.ct_home, ask: !!game.flags.dx_om_ask, table: table() }; });
const a1l = await said();
check('INPUT: Zoé (TALK): the chapter\'s own line first (the taps run: ct_home), not the quest\'s; then the table is laid for four (the fourth chair, the bowls)', a1.r === 'talked' && a1.ctHome && !a1.ask && has(a1l, /It runs!/) && a1.table.chair && a1.table.bowls, { a1, a1l });
await shot('01-one-chair-too-many');
const a2 = await ev(() => { const S = OP().seats.guest; return P.use(S.x, S.z, { kind: 'dx_om_chair', near: 0.9 }).r; });
const a2l = await said();
check('INPUT: the fourth chair looked at (E): an old green cushion; Zoé put it out', a2 === 'used' && has(a2l, /fourth chair/), { a2, a2l });
const a3 = await ev(() => { const r = P.talk('zoe'); return { r: r.r, om: om(), j: game.story.journal().find((x) => x.title === 'One More Place')?.lines?.map((l) => l.key) }; });
const a3l = await said();
check('INPUT: Zoé (TALK): the hot water, a proper meal; four chairs; Brix\'s place, next door, every week, until he moved up the lane; nobody has asked him; Arthur: the lane\'s benches; the journal has it', a3.r === 'talked' && a3.om.dx_om_ask && has(a3l, /four chairs/) && has(a3l, /Brix's chair/) && has(a3l, /moved up the lane/) && has(a3l, /Nobody's asked him/) && has(a3l, /benches along the lane/) && (a3.j || []).includes('om_j_ask'), { a3, a3l });
const a3b = await ev(() => { const r = P.talk('zoe'); return r.r; });
const a3bl = await said();
check('Zoé again: the quest\'s story is not told twice (her own word instead)', a3b === 'talked' && !has(a3bl, /Brix's chair/), a3bl);

// ---------------------------------------------------------------- out on the lane: Brix
const b0 = await ev(() => { const G = game, b = P.npc('brix'), t0 = G.time; const r = P.talk('brix', { run: false }); return { r: r.r, to: r.to, secs: +(G.time - t0).toFixed(1), at: [+b.pos.x.toFixed(1), +b.pos.z.toFixed(1)], yes: !!G.flags.dx_om_yes, seenNow: b.present }; });
const b0l = await said();
check('INPUT: out of the house and up the lane to Old Brix on his round (TALK, walked by the harness\'s planner; game seconds logged): Zoé\'s place for him; "forgotten the way up the lane"; he brings his radio; the short cut', b0.r === 'talked' && b0.to === 'brix' && b0.yes && has(b0l, /laid a place for you/) && has(b0l, /forgotten the way/) && has(b0l, /bringing my radio/) && has(b0l, /short cut/), { b0, b0l });
await shot('02-brix-on-the-lane');
const b1 = await ev(() => { const G = game; G.step(1); const seen = P.npc('brix').present; const r = P.talk('brix'); return { seen, r: r.r }; });
const b1l = await said();
check('while Twinsen is still with him, Brix is still there; asked again: "I\'ll be there before you"', b1.seen && b1.r === 'talked' && has(b1l, /before you/), { b1, b1l });
const b2 = await ev(() => { const G = game, t0 = G.time; const e = homeDoor(); G.step(1); return { e, secs: +(G.time - t0).toFixed(1), room: G.room?.id, brix: P.npc('brix').present, guest: npcAt('om_brix'), table: table(), om: om() }; });
check('INPUT: home through the front door: Brix is at the table, seated on the fourth chair, his radio in front of the table\'s corner; the street\'s Brix is gone (he took his short cut)', b2.room === 'house' && !b2.brix && b2.guest.present && b2.guest.anim === 'sit' && b2.table.radio && b2.table.chair, b2);
await shot('03-brix-at-the-table');
iso('Save & quit through the pause menu, then Continue (as a player)');
await saveQuit(); await reboot();
const s0 = await ev(() => ({ room: game.room?.id, om: om(), guest: npcAt('om_brix'), brix: P.npc('brix').present, table: table() }));
check('after Continue: Brix still at the table with his radio, not on the street; his yes kept', s0.om.dx_om_yes && s0.guest.present && !s0.brix && s0.table.radio, s0);
if (s0.room !== 'house') await ev(() => { homeDoor(); });

// ---------------------------------------------------------------- the radio's rule, then the tuning with the sound off
const c0 = await ev(() => { const r = P.talk('om_brix'); return { r: r.r, here: !!game.flags.dx_om_here }; });
const c0l = await said();
check('INPUT: Brix at the table (TALK): the set hisses since he moved; the rule before it is needed: turn the wheel slowly, watch the green eye, wide open is a station; the goal: the house\'s tune through the window', c0.r === 'talked' && c0.here && has(c0l, /only hisses/) && has(c0l, /green eye/) && has(c0l, /Wide open means a station/) && has(c0l, /house's tune/), { c0, c0l });
iso('the sound muted for the rest of the tuning: the master volume at 0 (Settings would do the same): only the visible cues are used');
await ev(() => { const A = game.audio; A.vol.master = 0; A.applyVolumes?.(); });
const c1 = await ev(() => { const G = game, T = OP().touch; const g0 = P.go(T.front.x, T.front.z, { tol: 0.2, maxT: 30 }).r; P.face(OP().wheel.x, OP().wheel.z); const tg = P.target()?.kind; P.tap('KeyE', 0.1); for (let i = 0; i < 80 && G.state !== 'cutscene'; i++) G.step(0.05); G.step(0.4);
  const h = G.hero, hand = new h.pos.constructor(); h.rig.j.armR.hand.getWorldPosition(hand); const W = OP().wheel;
  return { g0, tg, state: G.state, tune: !!O().tune, hand: +Math.hypot(hand.x - W.x, hand.y - W.y, hand.z - W.z).toFixed(3), mood: G.audio.mood, strip: document.querySelector('#omtune')?.textContent, eye: OP().state.eye }; });
check('INPUT: the radio (E: Tune): his right hand on the wheel (within 8 cm); the close-up; the room hushes (music: silence); the strip: (hiss) and the keys', c1.tg === 'dx_om_radio' && c1.state === 'cutscene' && c1.tune && c1.hand < 0.08 && c1.mood === 'silence' && /\(hiss\)/.test(c1.strip) && /Turn the wheel/.test(c1.strip) && /Let go/.test(c1.strip), c1);
await shot('04-tuning-close-up', false);
const c2 = await ev(() => tuneTo('ArrowRight', /RADIO/));
await ev(() => game.step(3));
const c2b = await ev(() => ({ strip: document.querySelector('#omtune')?.textContent, wrong: game.flags.dx_om_wrong, tuned: !!game.flags.dx_om_tuned, state: game.state }));
check('INPUT, a wrong station by sight (→ held until the eye opens wide): the project\'s bulletin in the caption; Brix: not that; counted, nothing lost, still tuning', c2.eye > 0.97 && /Joint Project/.test(c2.cap) && /Not that/.test(c2b.strip) && c2b.wrong === 1 && !c2b.tuned && c2b.state === 'cutscene', { c2, c2b });
await shot('05-a-wrong-station', false);
const c3 = await ev(() => { const G = game; G.input.keys.add('ArrowRight'); G.step(0.6); G.input.keys.delete('ArrowRight'); G.step(0.1); const k = O().tune.k; P.tap('KeyE', 0.1); G.step(0.2); return { k: +k.toFixed(3), state: G.state, dial: G.flags.dx_om_dial, mood: G.audio.mood }; });
check('INPUT: E lets go half way: back in play, the needle\'s place kept (dx_om_dial), the house\'s music back', c3.state === 'play' && Math.abs(c3.dial - c3.k) < 0.002 && c3.mood === 'home', c3);
const c4 = await ev(() => { const G = game; P.face(OP().wheel.x, OP().wheel.z); P.tap('KeyE', 0.1); for (let i = 0; i < 80 && G.state !== 'cutscene'; i++) G.step(0.05); G.step(0.3); return { state: G.state, k: +O().tune.k.toFixed(3), needle: +OP().state.needle.toFixed(3) }; });
check('INPUT: E again: the tuning goes on from where the needle was left', c4.state === 'cutscene' && Math.abs(c4.k - c3.k) < 0.002, { c3, c4 });
const c5 = await ev(() => { const r = tuneTo('ArrowRight', /tune you know/); const G = game; const o = { ...r, mood: G.audio.mood }; for (let i = 0; i < 40 && G.state === 'cutscene'; i++) G.step(0.1); o.state = G.state; o.tuned = !!G.flags.dx_om_tuned; return o; });
await shot('06-the-house-tune');
const c5l = await ev(() => { P.settle(); const s = window._said.slice(); window._said.length = 0; return s; });
check('INPUT, by sight (→ held until the eye opens wide again): ♪ a tune you know ♪; held there: found; the room\'s music is the house\'s own (\'home\'); Zoé: that\'s ours; Arthur: the eye; Brix: now it sounds like a house; Zoé: sit down', c5.eye > 0.97 && /tune you know/.test(c5.cap) && c5.mood === 'home' && c5.tuned && has(c5l, /That's ours/) && has(c5l, /eye's wide open/) && has(c5l, /sounds like a house/) && has(c5l, /Sit down, all of you/), { c5, c5l });

// ---------------------------------------------------------------- the meal
const d0a = await ev(() => { const h = game.hero; h.hp = Math.max(1, h.maxHp - 4); const r = sitDown(); window._sd = r; window._subs0 = []; for (let i = 0; i < 80; i++) { game.step(0.1); const el = document.querySelector('#cine-sub'); if (el?.classList.contains('show')) { const t = el.textContent; if (window._subs0[window._subs0.length - 1] !== t) window._subs0.push(t); } } return r; });
await page.waitForTimeout(1500);   // (the fade's CSS transition runs in real time, not in the stepped game time)
await shot('07-the-first-meal', false);
const d0 = await ev(() => { const h = game.hero; const r = window._sd; const f = film(); return { ...r, subs: [...(window._subs0 || []), ...f.subs], t0: 8, t: +f.t.toFixed(1), state: game.state, hp: h.hp, max: h.maxHp, om: om(), guest: npcAt('om_brix').present, brix: P.npc('brix').present, table: table(), toast: document.querySelector('#toast')?.textContent || '' }; });
check('INPUT: "Sit down" at Twinsen\'s chair (E): the meal\'s scene: the moved picture, "nobody tells me anything up the lane", Arthur and the radio, "Come next week. Same chair."; life refilled', d0.tg === 'dx_om_sit' && d0.cine && d0.state === 'play' && d0.hp === d0.max && d0.subs.some((s) => /moved the picture/.test(s)) && d0.subs.some((s) => /up the lane/.test(s)) && d0.subs.some((s) => /Same chair/.test(s)) && d0.subs.some((s) => /sulks/.test(s)), d0);
check('afterwards: the quest done (dx_om_done); Brix gone home with his radio, back on the street; the fourth chair stays, the bowls cleared', d0.om.dx_om_done && !d0.guest && d0.brix && d0.table.chair && !d0.table.bowls && !d0.table.radio, d0);
await shot('08-after-the-meal');
const d1 = await ev(() => { const r1 = P.talk('brix'); const r2 = P.talk('brix'); return { r1: r1.r, r2: r2.r }; });
const d1l = await said();
check('INPUT: Brix on the lane afterwards (TALK twice): his word of it once ("the soup was adequate"), then his usual lines', d1.r1 === 'talked' && d1.r2 === 'talked' && d1l.filter((l) => /adequate/.test(l)).length === 1, { d1, d1l });
iso('chapter 2 on to Vesk\'s departure by flags (c1_veskGone): Arthur\'s radio scene');
const d2 = await ev(() => { const G = game, f = G.flags; Object.assign(f, { c1_tour: true, c1_needZoe: true, c1_zoeStart: true, c1_plan: true, c1_zoeDone: true, c1_veskGone: true }); G.story.applyFlags(); G.story.refreshCast(); G.step(0.3); homeDoor(); const r = P.talk('arthur'); return { r: r.r, radio: !!f.c1_radio }; });
const d2l = await said();
check('INPUT: Arthur\'s radio scene (TALK): he tuned Grandpa\'s radio "slowly, like Mr Brix showed us"', d2.r === 'talked' && d2.radio && has(d2l, /like Mr Brix showed us/), { d2, d2l });

// ---------------------------------------------------------------- later chapters: a meal at home
const later = async (key, re) => {
  iso(`chapter ${key} by its flags (the dx_om_ state kept): Twinsen put before his front door`);
  return ev(({ key }) => {
    setChapter(key); const G = game; G.hero.hp = 3;
    const e = homeDoor(); G.step(1);
    window._out = { e, room: G.room?.id, table: table(), guest: npcAt('om_brix'), zoe: O().atHome('zoe'), arthur: O().atHome('arthur'), ready: O().mealReady() };
    const S = OP().seats.hero; P.go(S.x + 0.9, S.z + 1.2, { tol: 0.3, maxT: 30 });
  }, { key });
};
const later2 = (key) => ev(() => {
    const G = game, out = window._out;
    const s = sitDown(); const f = film(); out.tg = s.tg; out.subs = f.subs; out.hp = G.hero.hp; out.om = om();
    out.after = { table: table(), guest: P.npc('om_brix').present };
    // in and out of the house: no second meal; out of the garden and back: one more (music and food: the chapter's talk heard)
    P.exitTo('outdoor'); G.step(0.5); homeDoor(); G.step(1); out.again = { ready: O().mealReady(), guest: P.npc('om_brix').present };
    const d = G.world.houses[0].door; P.exitTo('outdoor'); const w = P.go(-42.4, 30.6, { tol: 2, maxT: 120 }); out.walk = { r: w.r, from: +Math.hypot(G.hero.pos.x - d.x, G.hero.pos.z - d.z).toFixed(1) }; G.step(0.6); out.away = !!G.flags.dx_om_away; homeDoor(); G.step(1);
    out.back = { ready: O().mealReady(), guest: P.npc('om_brix').present };
    const s2 = sitDown(); const f2 = film(); out.second = { tg: s2.tg, subs: f2.subs, t: +f2.t.toFixed(1) };
    return out;
  });
for (const [key, re] of [['dig', /every radio on the island|gets what it likes/], ['council', /old fortress|their list|Grandpa Gilbert/]]) {
  await later(key, re);
  if (key === 'dig') await shot('09-chapter4-the-table-laid');
  const o = await later2(key);
  check(`chapter ${key}, home by input: the table laid for four, Brix at it with his radio (its eye open: the house's tune); E at the chair: a meal with this chapter's own conversation; life refilled`, o.room === 'house' && o.table.bowls && o.table.radio && o.table.eye > 0.97 && o.guest.present && o.tg === 'dx_om_sit' && o.subs.length >= 3 && re.test(o.subs.join(' ')) && o.hp === 10, o);
  check(`chapter ${key}: in and out of the door, no second meal; out of the garden (40 m) and back: another, music and food only (no lines)`, !o.again.ready && !o.again.guest && o.away && o.back.ready && o.back.guest && o.second.tg === 'dx_om_sit' && o.second.subs.length === 0, o);
}
const n0 = await ev(() => { setChapter('network'); const G = game; homeDoor(); G.step(1); return { room: G.room?.id, zoe: O().atHome('zoe'), ready: O().mealReady(), table: table(), guest: P.npc('om_brix').present }; });
check('chapter 10 (Zoé in the lighthouse): no meal; the fourth chair still at the table', !n0.ready && !n0.guest && n0.table.chair && !n0.table.bowls, n0);

// text: English, short, no night words in any new line
const tx = await ev(async () => { const { STR } = await import('/src/game/i18n.js'); const keys = Object.keys(STR.en).filter((k) => /^om_/.test(k)); const all = keys.flatMap((k) => [].concat(STR.en[k])); return { n: keys.length, bad: all.filter((s) => /\b(night|evening|tonight|sunset|dawn|dusk|dinner|supper)\b/i.test(s)), long: all.filter((s) => s.split(/(?<=[.!?])\s+/).length > 3) }; });
check('the quest\'s text: no night, evening, tonight, sunset, dawn, dusk (nor dinner or supper); no line of more than three sentences', tx.n > 60 && tx.bad.length === 0 && tx.long.length === 0, tx);
await browser.close();

// ---------------------------------------------------------------- old saves (from before this change)
for (const [fx, key, chair] of [['base-04', 'project', true], ['new-04', 'project', false], ['base-12', 'council', true]]) {
  ({ browser, page } = await launch({ scale: 1 }));
  const st = JSON.parse(fs.readFileSync(FIX(fx), 'utf8'));
  const raw = st.origins.flatMap((o) => o.localStorage).find((i) => i.name === 'lba3_save_v1').value;
  await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers();
  const o = await ev(() => { const G = game, st0 = G.state, ch = G.flags.chapterKey, om0 = om(); G.regions.ensure('house', 'test'); O().ensure(); O().applyWorld(); return { state: st0, ch, om: om0, table: table(), guest: P.npc('om_brix').present }; });
  check(`an old save (${fx}, chapter ${key}, before this change) loads: in play; no dx_om_ state made up; the fourth chair ${chair ? 'out (the quest open in this chapter)' : 'not yet (the hot water not yet in the house)'}`, o.state === 'play' && o.ch === key && Object.keys(o.om).length === 0 && o.table && o.table.chair === chair && !o.guest, o);
  await browser.close();
}
done();
