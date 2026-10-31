// MAGIC-LEVELS (docs/lba3-production/MAGIC_LEVELS.md, src/game/story/magic.js): Twinsen's magic level is raised by
// the story only, as in LBA2, and spread over the game.
//   - no shop or vendor sells a magic level (Pippa's stall in chapters 1 and 2, Nara's case on Zeelich): every item
//     each one offers is bought, and the level does not move; a magic flask still fills the magic;
//   - level 1 at a new game and with the ball from the cupboard; still 1 at the end of chapter 1 (the well), of
//     chapter 2 (the joint project) and of chapter 3;
//   - each later step fires once at its moment (the chapter's own hook, called twice: one level, one toast) and fills
//     the magic: 2 at the Temple of Bù's warm discs (ch. 4), 3 at Sendell's crystal (ch. 7), 4 when the five stations
//     send the code (ch. 10); Save → Continue keeps the level;
//   - older saves: a level bought before (in chapter 1 or 2) is kept, and its later moment only fills the magic; a save
//     in a later chapter at level 1 gets the levels its chapter has given (once, with a toast).
// Story hooks are called directly (the chapters' own tests play them by input): this checks the levels, not the
// puzzles. PASS/FAIL lines, a VERDICT line and the exit code.
import { launch, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const URL0 = (process.env.GAME_URL || 'http://localhost:8123/') + '?nocine';

// load the page; mode 'new' (a new game) or 'continue' (the autosave); the helpers and the recorders
const boot = async (mode) => {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 480000 });
  await ev((mode) => {
    const G = window.game; G.testFreeze = true;
    // (recorders first: a load's own toasts count)
    window._toasts = [];
    const tt = G.hud.toast.bind(G.hud);
    G.hud.toast = (k, v) => { window._toasts.push(k); return tt(k, v); };
    window._said = [];
    const sv = G.say;
    G.say = function (n, lines, ...a) { window._said.push(...(Array.isArray(lines) ? lines : [lines])); return sv.call(this, n, lines, ...a); };
    G.act(mode);
    for (let i = 0; i < 20; i++) G.step(0.05);
    G.testFreeze = true;
    window.T = {
      talkAll(max = 120) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      // into the next chapter from `key` (as the chapter tests jump): the card, its first lines
      next(key, extra = {}) { Object.assign(G.flags, { prologueDone: true, intro: true, chapterKey: key, chapter: G.story.chapters.findIndex((c) => c.key === key) }, extra); G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return G.flags.chapterKey; },
      lv() { const h = G.hero; return { lv: h.magicLevel, mp: h.mp, max: h.mpMax, ch: G.flags.chapterKey, ml: ['ml_2', 'ml_3', 'ml_4'].filter((k) => G.flags[k]) }; },
      // what each shop offers, and whether buying all of it moves the level
      shop(where) {
        const h = G.hero, hud = G.hud, own = hud.openShop;
        let got = null;
        hud.openShop = (items, onBuy, onClose) => { got = { items, onBuy, onClose }; };
        try { G.openShop(where); } finally { hud.openShop = own; }
        const list = got.items(), before = h.magicLevel;
        h.coins = 9999; h.clovers = 0;
        for (const it of list) { if (!it.disabled) got.onBuy(it); }
        const after = h.magicLevel;
        got.onClose(); G.step(0.1);
        return { ids: list.map((i) => i.id), keys: list.map((i) => i.key), before, after };
      },
    };
  }, mode);
};
const toasts = () => ev(() => { const s = window._toasts.slice(); window._toasts.length = 0; return s; });
const said = () => ev(() => { const s = window._said.slice(); window._said.length = 0; return s; });
const noMagic = (s) => !s.ids.includes('magic') && !s.keys.some((k) => /shop_magic/.test(k)) && s.after === s.before;
const ups = (ts) => ts.filter((k) => k === 'ml_toast_up').length;

// ---------------------------------------------------------------- a new game, chapter 1 (the well)
await boot('new');
const start = await ev(() => ({ ...T.lv(), ball: game.hero.hasBall, ch: game.flags.chapterKey }));
check('a new game: magic level 1, the magic full, no ball yet, no story step', start.lv === 1 && start.mp === start.max && !start.ball && start.ml.length === 0, start);
const sh0 = await ev(() => T.shop('citadel'));
check('chapter 1: Pippa\'s stall sells no magic level (bought out, the level stays 1)', noMagic(sh0) && sh0.after === 1, sh0);
await ev(() => { const G = game; G.hero.coins = 0; G.story.interact({ kind: 'roomsearch', spot: { id: 'cupboard' } }); T.talkAll(); });
const ball = await ev(() => ({ ...T.lv(), ball: game.hero.hasBall }));
check('the ball from the cupboard: level 1 (yellow)', ball.ball && ball.lv === 1 && ball.mp === ball.max, ball);
await toasts(); await said();

// ---------------------------------------------------------------- chapter 2 (the joint project), chapter 3
const c2 = await ev(() => { T.next('well'); return T.lv(); });
check('the end of chapter 1 (into chapter 2): still level 1', c2.ch === 'project' && c2.lv === 1, c2);
const sh1 = await ev(() => T.shop('citadel'));
check('chapter 2: Pippa\'s stall and the arsenal\'s goods sell no magic level', noMagic(sh1) && sh1.ids.length >= 4 && sh1.after === 1, sh1);
const c3 = await ev(() => { T.next('project', { c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); return T.lv(); });
check('the end of chapter 2 (into chapter 3): still level 1, no step given', c3.ch === 'zeelich' && c3.lv === 1 && c3.ml.length === 0, c3);
const sh2 = await ev(() => T.shop('zeelich'));
check('chapter 3: Nara\'s case on Zeelich sells no magic level', noMagic(sh2) && sh2.ids.length >= 2 && sh2.after === 1, sh2);
// a flask still fills the magic
const flask = await ev(() => {
  const G = game, h = G.hero, hud = G.hud, own = hud.openShop; let got = null;
  hud.openShop = (items, onBuy, onClose) => { got = { items, onBuy, onClose }; };
  try { G.openShop('citadel'); } finally { hud.openShop = own; }
  h.mp = 0; h.coins = 20;
  const it = got.items().find((i) => i.id === 'flask'); got.onBuy(it); got.onClose(); G.step(0.1);
  return { mp: h.mp, max: h.mpMax, coins: h.coins };
});
check('a magic flask from the stall still fills the magic', flask.mp === flask.max && flask.coins === 15, flask);

// ---------------------------------------------------------------- chapter 4: the warm discs (level 2)
const c4 = await ev(() => { T.next('zeelich'); return T.lv(); });
check('the end of chapter 3 (into chapter 4): still level 1', c4.ch === 'dig' && c4.lv === 1, c4);
await toasts(); await said();
const seals = await ev(() => {
  const G = game, ch = G.story.cur; G.hero.mp = 1;
  ch.openSeal(0); T.talkAll(); ch.openSeal(1); T.talkAll();
  const two = T.lv();
  ch.openSeal(2); T.talkAll();
  return { two, three: T.lv(), seals3: !!G.flags.c4_seals3, ball: G.story.magic.ballNote() };
});
const t4 = await toasts(), s4 = await said();
check('chapter 4: two warm discs give nothing; the third opens the door and gives level 2 (green), the magic full', seals.two.lv === 1 && seals.three.lv === 2 && seals.three.mp === seals.three.max && seals.three.ml.includes('ml_2') && seals.seals3, seals);
check('chapter 4: one "Magic level 2" toast and Twinsen\'s line about the ball', ups(t4) === 1 && s4.some((l) => /glowing green/.test(l)), { t4, s4: s4.slice(-3) });
check('the inventory tells where the green came from', /Temple of B/.test(seals.ball), seals.ball);
const again = await ev(() => { const ch = game.story.cur; game.hero.mp = 0; ch.openSeal(2); T.talkAll(); game.story.magic.grant(2); T.talkAll(); return T.lv(); });
const t4b = await toasts();
check('chapter 4: the moment fires once (the hook and grant again: no second toast, level 2, no refill: only the slow regeneration)', again.lv === 2 && ups(t4b) === 0 && again.mp < 1, { again, t4b });   // (magic regenerates slowly while the lines play)
// Save → Continue keeps it
await ev(() => { game.hero.mp = 5; game.save(false); });
await boot('continue');
const rl = await ev(() => T.lv()), trl = await toasts();
check('Save → Continue in chapter 4: level 2 and its step kept, the saved magic (5, plus regeneration), no toast', rl.lv === 2 && rl.ml.includes('ml_2') && rl.ch === 'dig' && rl.mp >= 5 && rl.mp < 6 && ups(trl) === 0, { rl, trl });

// ---------------------------------------------------------------- chapter 7: Sendell (level 3)
const c7 = await ev(() => { T.next('pass'); return T.lv(); });
check('chapters 5 and 6 pass at level 2 (into chapter 7)', c7.ch === 'observatory' && c7.lv === 2, c7);
await toasts(); await said();
const sendell = await ev(() => { const G = game; G.hero.mp = 0; G.story.cur.lightCrystal(); T.talkAll(); return { ...T.lv(), s: !!G.flags.c7_sendell }; });
const t7 = await toasts(), s7 = await said();
check('chapter 7: Sendell gives a little of her light: level 3 (red), the magic full, one toast', sendell.s && sendell.lv === 3 && sendell.mp === sendell.max && ups(t7) === 1 && s7.some((l) => /a little of my light/.test(l)), { sendell, t7 });
const again7 = await ev(() => { game.story.magic.grant(3); T.talkAll(); return T.lv(); });
check('chapter 7: once only', again7.lv === 3 && ups(await toasts()) === 0, again7);

// ---------------------------------------------------------------- chapter 10: the five stations (level 4)
const c10 = await ev(() => { T.next('council'); return T.lv(); });
check('chapters 8 and 9 pass at level 3 (into chapter 10)', c10.ch === 'network' && c10.lv === 3, c10);
await toasts(); await said();
const code = await ev(() => {
  const G = game; G.hero.mp = 0;
  G.story.cur.sendCode(); T.talkAll();
  for (let i = 0; i < 200 && (G.trans || G.state !== 'play'); i++) { G.step(0.05); if (G.state === 'dialog') T.talkAll(); }
  return T.lv();
});
const t10 = await toasts(), s10 = await said();
check('chapter 10: the code goes out, the shaft opens: level 4 (fire), one toast, then chapter 11', code.lv === 4 && code.ml.includes('ml_4') && ups(t10) === 1 && s10.some((l) => /catches fire/.test(l)) && code.ch === 'shell', { code, t10 });
const c11 = await ev(() => { T.next('shell'); return T.lv(); });
check('chapter 12 keeps level 4 (the maximum)', c11.ch === 'core' && c11.lv === 4, c11);

// ---------------------------------------------------------------- older saves
const oldSave = (flags, hero) => ({ v: 5, room: null, hero: { x: -36, z: -10, hp: 10, mp: 5, magicLevel: 1, clovers: 2, coins: 7, hasBall: true, behaviour: 'normal', ...hero }, flags: { prologueDone: true, intro: true, ...flags }, killed: [], collected: [], searched: [], crates: [] });
const loadSave = async (s) => { await ev((s) => localStorage.setItem('lba3_save_v1', JSON.stringify(s)), s); await boot('continue'); return ev(() => ({ ...T.lv(), toasts: window._toasts.slice() })); };
// the user's case: a green ball bought in chapter 1
const b1 = await loadSave(oldSave({ chapter: 0, chapterKey: 'well' }, { magicLevel: 2 }));
check('an old save with level 2 bought in chapter 1 keeps level 2 (never taken away)', b1.lv === 2 && b1.ch === 'well' && b1.ml.length === 0, b1);
const b2 = await loadSave(oldSave({ chapter: 1, chapterKey: 'project', c1_started: true }, { magicLevel: 3, mp: 5 }));
check('an old save with level 3 bought in chapter 2 keeps level 3', b2.lv === 3 && b2.ch === 'project', b2);
await toasts(); await said();
const b2dig = await ev(() => { T.next('zeelich'); const ch = game.story.cur; game.hero.mp = 0; for (const i of [0, 1, 2]) { ch.openSeal(i); T.talkAll(); } return T.lv(); });
const tb = await toasts(), sb = await said();
check('…and at chapter 4\'s discs it stays at 3: the magic fills, "Magic refilled", no level toast, the line without the colour', b2dig.lv === 3 && b2dig.mp === b2dig.max && b2dig.ml.includes('ml_2') && ups(tb) === 0 && tb.includes('ml_toast_full') && sb.some((l) => /full of magic/.test(l)), { b2dig, tb });
const b3 = await loadSave(oldSave({ chapter: 7, chapterKey: 'evacuation' }, { magicLevel: 1 }));
check('an old save in chapter 8 at level 1 gets the levels its chapter has given (3), with one toast', b3.lv === 3 && b3.mp === b3.max && b3.ml.includes('ml_2') && b3.ml.includes('ml_3') && !b3.ml.includes('ml_4') && ups(b3.toasts) === 1, b3);
const b4 = await loadSave(oldSave({ chapter: 6, chapterKey: 'observatory', c7_sendell: true }, { magicLevel: 2 }));
check('an old save in chapter 7 past Sendell\'s words gets level 3', b4.lv === 3 && b4.ml.includes('ml_3'), b4);
const b5 = await loadSave(oldSave({ chapter: 1, chapterKey: 'project' }, { magicLevel: undefined }));
check('a save without a level (broken) loads at level 1, not NaN', b5.lv === 1 && Number.isFinite(b5.max), b5);

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
