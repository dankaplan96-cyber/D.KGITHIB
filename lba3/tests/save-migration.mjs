// Save migration / recovery: old v1 saves load and are backed up; a save in a missing room lands outdoors;
// a corrupt save is set aside (never deleted) and a new game starts with a message. A format-4 save from before the
// final chapter was split in two (The Shell, The Core) loads into the right half: the core room or a begun fight →
// The Core; Sendell's chamber and earlier → The Shell; the epilogue keeps its place.
// Format 6 (EXP-PLAN §6, the expanded campaign): four chapters come between the council and the network.
//   - a v5 save before them (here: the council before the vote) plays the expanded campaign (exp): after the vote the
//     story goes on to chapter 10 (OREN-GUARDIAN B: Borrowed Time, OG-1), then through the empty shells 11-13 to the
//     network, now chapter 14;
//   - a v5 save in the network (or later) goes on as the base game (exp_base): its chapters keep their numbers
//     (network 10), the story goes from the network to the shell as before;
//   - a v5 finished save goes on as the base game too, keeps its postgame, and the Load menu offers "Expanded campaign:
//     start at chapter 10": a NEW slot (an empty one, or one the player confirms over; never the source), the later
//     chapters' flags and owed rewards gone, the hop-pack and the pulse tool taken back, the magic at the chapter-9
//     level, health, kashes and other weapons kept; loading it passes the shell and begins the network (chapter 14);
//   - a v5 save is kept untouched beside the migrated one (lba3_save_v1_backup_v5);
//   - no reward is paid twice: an owed reward is settled once, a save → reload pays nothing again;
//   - a chapter key this build doesn't know falls back to the last known chapter before it, and says so.
// SHAFT-CITADEL: a save on Zeelich's drill platform during The Shell comes out at the shaft's new top, Citadel's station.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker, expectError, open } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
async function run(name, save) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.addInitScript((s) => { localStorage.setItem('lba3_save_v1', s); }, JSON.stringify(save));
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/'), { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: +process.env.BOOT_TIMEOUT || 400000 });
  await page.evaluate(() => { game.testFreeze = true; game.act('continue'); for (let i = 0; i < 20; i++) game.step(0.05); });
  const r = await page.evaluate(() => {
    const ls = Object.keys(localStorage).filter((k) => k.startsWith('lba3_save')).sort();
    const cur = JSON.parse(localStorage.getItem('lba3_save_v1') || 'null');
    const st = game.world.station, h = game.hero;
    return { state: game.state, room: game.room?.id || null, chapter: game.flags.chapter, chapterKey: game.flags.chapterKey, cur: game.story.cur.key, exp: game.flags.exp, base: game.flags.exp_base, keys: ls, savedV: cur?.v ?? null, toast: document.querySelector('#toast')?.textContent?.slice(0, 80),
      bore: st ? +Math.hypot(h.pos.x - st.bore.x, h.pos.z - st.bore.z).toFixed(1) : null, interact: game.findInteractable()?.kind ?? null };
  });
  results.push([name, r, errs.length ? errs : 'no errors']);
  await ctx.close();
}
const v1 = { v: 1, room: null, hero: { x: -36, z: -10, hp: 10, mp: 5, magicLevel: 1, clovers: 2, coins: 7, hasBall: true, behaviour: 'normal' }, flags: { chapter: 1, prologueDone: true, intro: true, c1_started: true } };
await run('v1 save (no lists)', v1);
await run('save in a missing room', { ...v1, v: 2, room: 'nosuchroom', killed: [], collected: [], searched: [], crates: [] });
// the corrupt save is reported by the game itself (src/main.js startContinue: console.error('save load failed'))
expectError(/^save load failed/, 'the corrupt save is read on purpose; the game logs it and starts fresh');
await run('corrupt save', { v: 2, hero: 'garbage' });
// (a format-4 save as the build before the split wrote it: the final chapter was one, key 'shell', position 10; 'home' was 11)
const shellFlags = { prologueDone: true, intro: true, chapter: 10, chapterKey: 'shell', c3_started: true, c3_diagram: true, c3_ladder: true, c3_cooled: true, c3_pillar0: true, c3_pillar1: true, c3_pillar2: true, c3_sendell: true };
const v4 = { v: 4, hero: { x: 0, z: 0, hp: 10, mp: 5, magicLevel: 1, clovers: 2, coins: 7, hasBall: true, behaviour: 'normal' }, killed: [], collected: [], searched: [], crates: [] };
await run('v4 in the core room', { ...v4, room: 'c3core', flags: { ...shellFlags } });
await run('v4 in Sendell\'s chamber, her words done', { ...v4, room: 'c3sendell', flags: { ...shellFlags } });
await run('v4 in the gallery', { ...v4, room: 'c3gallery', flags: { ...shellFlags, c3_sendell: false } });
await run('v4 fight begun (pylon 1)', { ...v4, room: 'c3core', flags: { ...shellFlags, c3_fight: true, c3_pylon0: true } });
await run('v4 the epilogue', { ...v4, room: null, flags: { prologueDone: true, intro: true, chapter: 11, chapterKey: 'home', c3_done: true, ep_dinner: true, ep_free: true } });
// SHAFT-CITADEL: a format-5 save from before the shaft moved to Citadel's station, made on Zeelich's drill platform during
// The Shell (he had come up the old lift there): it comes out beside the station's bore on Citadel; one in the shaft's room
// stays in it, and one in the street on Zeelich (by spaceship, not the lift) stays where it was
const v5 = { ...v4, v: 5 };
const shellNow = { ...shellFlags, chapter: 10, c3_cooled: false, c3_pillar0: false, c3_pillar1: false, c3_pillar2: false, c3_sendell: false };
await run('v5 shell, on Zeelich\'s platform', { ...v5, room: 'zeelich', hero: { ...v5.hero, x: 2452, z: 2 }, flags: { ...shellNow } });
await run('v5 shell, in the shaft\'s room', { ...v5, room: 'c3shaft', hero: { ...v5.hero, x: 1797, z: -1 }, flags: { ...shellNow } });
await run('v5 shell, in Zeelich\'s street', { ...v5, room: 'zeelich', hero: { ...v5.hero, x: 2400, z: 0 }, flags: { ...shellNow } });
for (const r of results) console.log(JSON.stringify(r));
const [[, a], [, b], [, c], [, d4core], [, d4sendell], [, d4gallery], [, d4fight], [, d4home], [, e5plat], [, e5shaft], [, e5street]] = results;
// (positions in format 6's order: council 8, throttle 9 … balances 12, network 13, shell 14, core 15, home 16)
check('a v1 save (no lists) loads into play in chapter project, upgraded to format 6, the expanded campaign, the v1 kept as a backup', a.state === 'play' && a.chapterKey === 'project' && a.cur === 'project' && a.keys.includes('lba3_save_v1_backup_v1') && a.savedV === 6 && a.exp === 1 && !a.base, a);
check('a save in a missing room lands outdoors in play, the old save kept as a backup', b.state === 'play' && b.room === null && b.chapterKey === 'project' && b.keys.includes('lba3_save_v1_backup_v2'), b);
check('a corrupt save is set aside (never deleted), a new game starts with a message', c.keys.includes('lba3_save_v1_unreadable') && c.chapterKey === 'well' && c.chapter === 0 && c.toast.length > 0, c);
check('a v4 save in the core room loads into The Core, upgraded, on the base campaign, the v4 kept as a backup', ['play', 'dialog'].includes(d4core.state) && d4core.room === 'c3core' && d4core.chapterKey === 'core' && d4core.cur === 'core' && d4core.chapter === 15 && d4core.savedV === 6 && d4core.base === 1 && !d4core.exp && d4core.keys.includes('lba3_save_v1_backup_v4'), d4core);
check('a v4 save in Sendell\'s chamber stays in The Shell', d4sendell.state === 'play' && d4sendell.room === 'c3sendell' && d4sendell.chapterKey === 'shell' && d4sendell.cur === 'shell' && d4sendell.chapter === 14 && d4sendell.base === 1, d4sendell);
check('a v4 save in the gallery stays in The Shell', ['play', 'dialog'].includes(d4gallery.state) && d4gallery.room === 'c3gallery' && d4gallery.cur === 'shell' && d4gallery.chapter === 14, d4gallery);
check('a v4 save with the core fight begun loads into The Core', d4fight.state === 'play' && d4fight.cur === 'core' && d4fight.chapter === 15 && d4fight.room === 'c3core', d4fight);
check('a v4 save in the epilogue stays in the epilogue, on the base campaign', d4home.state === 'play' && d4home.chapterKey === 'home' && d4home.cur === 'home' && d4home.chapter === 16 && d4home.base === 1, d4home);
// SHAFT-CITADEL (format 6: a v5 save in the shell goes on as the base game, the shell at position 14)
check('a v5 save on Zeelich\'s drill platform during The Shell comes out on Citadel beside the station\'s bore, in The Shell (base campaign)', e5plat.state === 'play' && e5plat.room === null && e5plat.cur === 'shell' && e5plat.chapter === 14 && e5plat.base === 1 && e5plat.bore < 6, e5plat);
check('a v5 save in the shaft\'s room stays there, in The Shell', ['play', 'dialog'].includes(e5shaft.state) && e5shaft.room === 'c3shaft' && e5shaft.cur === 'shell', e5shaft);
check('a v5 save in Zeelich\'s street during The Shell stays on Zeelich (only the platform moved)', e5street.state === 'play' && e5street.room === 'zeelich' && e5street.cur === 'shell', e5street);

// ================================================================ format 6: the expanded campaign (EXP-PLAN §6)
// One browser profile; each load is a fresh page on the title (as a player quits to the title and loads again).
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
watch(page);
const warns = [];
page.on('console', (m) => { if (m.type() === 'warning') warns.push(m.text()); });
const ev = (f, x) => page.evaluate(f, x);
const get = (k) => ev((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);
const slotK = (n) => (n ? 'lba3_slot_' + n : 'lba3_save_v1');
// the chapter cards shown since the page opened (their number and title)
const trackCards = () => ev(() => { const H = game.hud, o = H.chapterCard.bind(H); window.__cards = []; H.chapterCard = (a, b) => { window.__cards.push((a ? a + ' · ' : '') + b); return o(a, b); }; });
const card = () => ev(() => (window.__cards || []).join(' | '));
// a fresh page on the title (the saves in this profile's storage stay); the autosave removed unless `keepAuto`
const title = async (keepAuto = false) => { await open(page); await trackCards(); await ev((k) => { if (!k) localStorage.removeItem('lba3_save_v1'); game.showScreen('title'); }, keepAuto); };
// the state after a load: let the story run (a shell passes on behind a scene change; a chapter's first lines are said)
const settle = (max = 60) => ev((max) => { for (let i = 0; i < 3; i++) { game.step(0.2); P.settle(max); } }, max);
const view = () => ev(() => { const f = game.flags, h = game.hero; return { state: game.state, room: game.room?.id || null, key: f.chapterKey, chapter: f.chapter, cur: game.story.cur.key, exp: f.exp ?? null, base: f.exp_base ?? null, n: game.story.number(f.chapterKey) ?? null, next: game.story.keyOf(game.story.nextIndex()), coins: h.coins, clovers: h.clovers, hp: h.hp, lv: h.magicLevel, pulse: !!h.hasPulse, jet: !!h.arms?.jetpack, lantern: !!h.arms?.lantern, darts: h.arms?.darts ?? 0, owed: Object.keys(f).filter((k) => /_owe/.test(k)).map((k) => k + '=' + f[k]), c10: Object.keys(f).filter((k) => /^(c10_|c3_|ep_)/.test(k)).length, ml: Object.keys(f).filter((k) => /^ml_/.test(k)).sort(), journal: game.story.journal().map((c) => c.title), og: !!f.og_started }; });
const loadSlot = async (n) => { await page.click(`#btn-load`); await ev(() => game.step(0.05)); await page.click(`#loadgame .slot[data-slot="${n}"]`); await ev(() => game.step(0.05)); };

// (saves as the base game's format-5 build wrote them)
const hero5 = { x: -36, z: -10, hp: 9, mp: 5, magicLevel: 3, clovers: 2, coins: 50, hasBall: true, behaviour: 'normal', hasSword: true, hasPulse: false, weapon: 'ball', prevWeapon: 'fists', arms: { lantern: true, darts: 5 } };
const upToCouncil = { prologueDone: true, intro: true, c1_started: true, c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true, c4_seals3: true, c6_sword: true, c7_sendell: true, c8_started: true, c8_done: true, c9_clerk: true, c9_heard: true, c9_plans: true, ml_2: true, ml_3: true, w_pair: true };
const lists = { killed: [], collected: [], searched: [], crates: [], loot: [] };
const council5 = { v: 5, at: 1700000000000, played: 5400, room: 'council', hero: { ...hero5, x: 4844, z: 4.5 }, flags: { ...upToCouncil, chapter: 8, chapterKey: 'council' }, ...lists };
const network5 = { v: 5, at: 1700000100000, played: 6000, room: null, hero: { ...hero5, hasPulse: true, magicLevel: 3 }, flags: { ...upToCouncil, c9_vote: true, chapter: 9, chapterKey: 'network', c10_started: true, c10_pulse: true, w_owe: 2 }, ...lists };
const done5 = {
  v: 5, at: 1700000200000, played: 9000, room: null, thumb: 'data:image/jpeg;base64,AAAA',
  hero: { ...hero5, coins: 123, hp: 8, magicLevel: 4, hasPulse: true, weapon: 'pulse', arms: { lantern: true, darts: 5, jetpack: true, jetpackOn: true } },
  flags: { ...upToCouncil, c9_vote: true, chapter: 12, chapterKey: 'home', c10_started: true, c10_pulse: true, c10_done: true, c10_bore: true, c10_owe: 3, c3_started: true, c3_done: true, c3_turned: true, ep_dinner: true, ep_free: true, ml_4: true, a_jetHint: true, a_jetTin: true },
  killed: ['ndrone0', 'ndrone2', 'nmite1', 'nsentry', 'guardian', 'c3mite2', 'c3drone', 'p_mite0'], collected: ['coin_well_1'], searched: [], crates: [3],
  loot: [{ k: 'c10-bore-heart', t: 'heart', v: 1, w: 'out', x: -30, y: 1, z: -10 }, { k: 'crate-early', t: 'coin', v: 1, w: 'out', x: -31, y: 1, z: -10 }],
};
// a v6 save from a later build with a chapter this build lacks ('wound', between the shell and the core in its order)
const future6 = { v: 6, at: 1700000300000, room: null, order: ['well', 'project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'evacuation', 'council', 'throttle', 'survey', 'ballastra', 'balances', 'network', 'shell', 'wound', 'core', 'home'], hero: { ...hero5 }, flags: { ...upToCouncil, c9_vote: true, exp: 1, chapter: 15, chapterKey: 'wound' }, ...lists };
const early5 = { v: 5, at: 1600000000000, room: null, hero: { ...hero5, magicLevel: 1 }, flags: { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true }, ...lists };

// ---------------------------------------------------------------- the Load list; the chapter-10 start
await title();
await ev((S) => { localStorage.clear(); for (const [k, v] of Object.entries(S)) localStorage.setItem(k, JSON.stringify(v)); game.showScreen('title'); },{ lba3_slot_1: network5, lba3_slot_2: done5, lba3_slot_4: early5, lba3_slot_5: council5, lba3_slot_6: future6 });
const rows = () => ev(() => [...document.querySelectorAll('#loadgame .slot')].map((b) => ({ n: +b.dataset.slot, dis: b.disabled, txt: b.innerText.replace(/\s+/g, ' ').trim(), exp: !!document.querySelector(`#loadgame .slot-exp[data-slot="${b.dataset.slot}"]`) })));
await page.click('#btn-load'); await ev(() => game.step(0.05));
const L = await rows();
const expLabel = await ev(() => document.querySelector('#loadgame .slot-exp')?.textContent || '');
check('the Load list: a network save shows chapter 10 (the base game\'s numbers), the council save chapter 9, the later build\'s save its last known chapter (the shell, chapter 15)', /Chapter 10 · Baldino's Network/.test(L[1].txt) && /Chapter 9 · The Council/.test(L[5].txt) && /Chapter 15 · The Shell/.test(L[6].txt) && /Home/.test(L[2].txt), L);
check('the Load list offers "Expanded campaign: start at chapter 10" under the base-game saves only (network, finished), not under the council or earlier saves', L[1].exp && L[2].exp && !L[4].exp && !L[5].exp && !L[6].exp && !L[0].exp && expLabel === 'Expanded campaign: start at chapter 10', { L, expLabel });
const v5before = await get(slotK(2));
await page.click('#loadgame .slot-exp[data-slot="2"]'); await ev(() => game.step(0.05));
const E = await ev(() => ({ screen: game.screen, msg: document.querySelector('#expslot .menu-msg').textContent, slots: [...document.querySelectorAll('#expslot .slot')].map((b) => ({ n: +b.dataset.slot, dis: b.disabled })) }));
check('the option opens a slot list for the new save: the six manual slots, the source (slot 2) dimmed, a short line saying the source stays', E.screen === 'expslot' && E.slots.length === 6 && E.slots.find((s) => s.n === 2).dis && E.slots.filter((s) => s.dis).length === 1 && /Slot 2 stays/.test(E.msg), E);
await page.click('#expslot .slot[data-slot="3"]'); await ev(() => game.step(0.05));
const s3 = await get(slotK(3)), src2 = await get(slotK(2));
const back = await ev(() => ({ screen: game.screen, msg: document.querySelector('#loadgame .menu-msg').textContent, sel: document.querySelector('#loadgame .sel')?.dataset.slot }));
console.log('new slot 3:', JSON.stringify({ ...s3, thumb: s3?.thumb ? 'yes' : 'no' }).slice(0, 1500));
check('an empty slot takes the new save at once; back on the Load list with the new slot selected and a short message', back.screen === 'loadgame' && /Chapter 10 saved in Slot 3/.test(back.msg) && back.sel === '3', back);
check('the source save is untouched (still its format-5 self, byte for byte)', JSON.stringify(src2) === JSON.stringify(v5before) && src2.v === 5, { v: src2?.v });
const f3 = s3?.flags || {};
check('the new save: format 6, chapter 10 (throttle) of the expanded campaign, in the council chamber', s3?.v === 6 && f3.chapterKey === 'throttle' && f3.chapter === 9 && f3.exp === 1 && !('exp_base' in f3) && s3.room === 'council', { v: s3?.v, key: f3.chapterKey, ch: f3.chapter, exp: f3.exp, room: s3?.room });
check('the new save: every flag up to the council kept; the network\'s, shell\'s and epilogue\'s flags (and what they owed) gone; the hop-pack\'s tin stays taken', Object.keys(upToCouncil).every((k) => f3[k] === upToCouncil[k]) && f3.c9_vote === true && !Object.keys(f3).some((k) => /^(c10_|c3_|ep_|ur_)/.test(k)) && !('a_jetHint' in f3) && f3.a_jetTin === true, Object.keys(f3).sort());
check('the new save: the hop-pack and the pulse tool taken back (the pulse no longer in hand); health, kashes and the other gadgets kept; the magic at the chapter-9 level (3), its later step unmarked', !s3.hero.hasPulse && !s3.hero.arms.jetpack && !s3.hero.arms.jetpackOn && s3.hero.weapon === 'ball' && s3.hero.coins === 123 && s3.hero.hp === 8 && s3.hero.arms.lantern === true && s3.hero.arms.darts === 5 && s3.hero.magicLevel === 3 && f3.ml_3 && !f3.ml_4, s3?.hero);
check('the new save: the later chapters\' enemies stand again (their KOs dropped), others stay down; their bonus lying out goes, others stay; no picture of the old save', JSON.stringify(s3.killed) === JSON.stringify(['p_mite0']) && JSON.stringify(s3.loot.map((x) => x.k)) === JSON.stringify(['crate-early']) && !s3.thumb && Number.isFinite(s3.at) && s3.at > done5.at, { killed: s3.killed, loot: s3.loot, thumb: !!s3.thumb });
// an occupied slot asks first; the network save's start goes into slot 4 (the early save there is replaced on yes)
await page.click('#loadgame .slot-exp[data-slot="1"]'); await ev(() => game.step(0.05));
const srcClick = await ev(() => { const b = document.querySelector('#expslot .slot[data-slot="1"]'); return b.disabled; });
await page.click('#expslot .slot[data-slot="4"]'); await ev(() => game.step(0.05));
const ask = await ev(() => ({ screen: game.screen, h: document.querySelector('#slotconfirm h1').textContent, yes: document.querySelector('#slotconfirm [data-act="slotyes"]').textContent }));
const still4 = await get(slotK(4));
check('an occupied slot asks before the new save goes in ("Put the new save in Slot 4?"); nothing is written yet; the source can\'t be picked', ask.screen === 'slotconfirm' && /Put the new save in Slot 4\?/.test(ask.h) && still4?.flags?.chapterKey === 'project' && srcClick === true, { ask, srcClick });
await page.click('#slotconfirm [data-act="slotyes"]'); await ev(() => game.step(0.05));
const s4 = await get(slotK(4)), s1 = await get(slotK(1));
check('on yes the slot holds the new save (chapter 10, expanded); the network source stays as it was', s4?.flags?.chapterKey === 'throttle' && s4.flags.exp === 1 && s4.flags.w_owe === 2 && !s4.flags.c10_started && s1?.v === 5 && s1.flags.chapterKey === 'network' && (await ev(() => game.screen)) === 'loadgame', { s4: s4?.flags?.chapterKey, s1: s1?.flags?.chapterKey });
await ev(() => game.step(0.05));
await page.screenshot({ path: '/dev/shm/expf-loadlist.png' }).catch(() => {});

// load the new slot 3: chapter 10 (OREN-GUARDIAN B: no longer an empty shell) begins: Mira's call, the way home
await page.click('#loadgame .slot[data-slot="3"]'); await ev(() => game.step(0.05));
const n0 = await view();
await settle();
const cardN = await card();
const n1 = await view();
await ev(() => game.save(false));
console.log('chapter-10 start loaded:', JSON.stringify({ n0, cardN, n1 }));
check('loading the chapter-10 start: chapter 10 of the expanded campaign plays (Borrowed Time: Mira\'s call), chapter 11 (OG-2) comes after it', n0.key === 'throttle' && n1.key === 'throttle' && n1.chapter === 9 && n1.exp === 1 && !n1.base && n1.og && n1.next === 'survey', { n0: [n0.key, n0.room], n1: [n1.key, n1.chapter, n1.n, n1.og, n1.next], cardN });
check('…nothing of the later chapters: no network flags, no pulse tool, no hop-pack, the magic still 3, kashes as saved (123: nothing paid for the later chapters)', n1.c10 === 0 && !n1.pulse && !n1.jet && n1.lv === 3 && n1.coins === 123 && n1.owed.length === 0, n1);
check('…the journal has a page for chapter 10 ("10. Borrowed Time") and none for the three empty shells after it', n1.journal.includes('10. Borrowed Time') && !n1.journal.some((t) => /Under the Well|Ballastra|Balances/.test(t)) && n1.journal.includes('9. The Council'), n1.journal);

// ---------------------------------------------------------------- the council save, before the vote (the expanded campaign)
await title();
await loadSlot(5);
const k0 = await view();
const k5 = await get(slotK(5)), kb = await get('lba3_slot_5_backup_v5');
check('a v5 council save (before the vote) loads on the expanded campaign: chapter 9, position 8, the v5 kept untouched beside it', k0.key === 'council' && k0.chapter === 8 && k0.exp === 1 && !k0.base && k0.n === 9 && JSON.stringify(kb) === JSON.stringify(council5) && k5.v === 5, { k0: [k0.key, k0.chapter, k0.exp, k0.base, k0.state], backup: !!kb });
check('…the next chapter in its campaign is chapter 10, Borrowed Time (OREN-GUARDIAN B)', k0.next === 'throttle', k0.next);
// the vote (the council chamber's second hearing starts as he stands in it), then the next chapter
await settle(240);
const kCard = await card();
const k1 = await view();
const auto = await get('lba3_save_v1');
console.log('after the vote:', JSON.stringify({ k1, kCard }));
check('the vote: the story goes on to chapter 10, Borrowed Time, its card shown; the autosave is format 6 in it', k1.key === 'throttle' && k1.chapter === 9 && k1.exp === 1 && /Chapter 10/.test(kCard) && auto?.v === 6 && auto.flags.chapterKey === 'throttle' && auto.flags.exp === 1, { k1: [k1.key, k1.chapter, k1.room, k1.state], kCard, auto: auto && [auto.v, auto.flags.chapterKey] });

// ---------------------------------------------------------------- the network save (the base game); no reward twice
await title();
await loadSlot(1);
await settle();
const w0 = await view();
const wb = await get('lba3_slot_1_backup_v5');
check('a v5 network save goes on as the base game: exp_base, network still chapter 10, position 13, then the shell (no new chapters), its journal page "10."', w0.key === 'network' && w0.chapter === 13 && w0.base === 1 && !w0.exp && w0.n === 10 && w0.next === 'shell' && w0.journal.includes("10. Baldino's Network") && !w0.journal.some((t) => /^1[3-6]\./.test(t)) && JSON.stringify(wb) === JSON.stringify(network5), { w0: [w0.key, w0.chapter, w0.base, w0.n, w0.next], j: w0.journal });
check('…Baldino\'s owed kashes are paid once on the load (50 + 2 x 5 = 60), the debt gone', w0.coins === 60 && !w0.owed.some((o) => o.startsWith('w_owe')), { coins: w0.coins, owed: w0.owed });
await ev(() => game.save(false));
await title(true);
await page.click('#btn-continue'); await ev(() => game.step(0.05));
await settle();
const w1 = await view();
check('save → Continue: nothing is paid again (60 kashes), still the base game\'s network, no second migration from the backup', w1.coins === 60 && w1.key === 'network' && w1.base === 1 && w1.n === 10, { coins: w1.coins, key: w1.key, base: w1.base });

// ---------------------------------------------------------------- the finished save (the base game, postgame kept)
await title();
await loadSlot(2);
await settle();
const h0 = await view();
check('a v5 finished save goes on as the base game in its epilogue (exp_base): hop-pack, pulse tool, level 4 and the kashes (123) kept', h0.key === 'home' && h0.chapter === 16 && h0.base === 1 && !h0.exp && h0.jet && h0.pulse && h0.lv === 4 && h0.coins === 123 && h0.state === 'play', { h0: [h0.key, h0.chapter, h0.base, h0.state, h0.jet, h0.pulse, h0.lv, h0.coins] });

// ---------------------------------------------------------------- a key this build lacks
await title();
warns.length = 0;
await loadSlot(6);
await settle();
const u0 = await view();
check('a save naming a chapter this build lacks ("wound") goes on from the last chapter before it that the build knows (the shell), and says so in the log', u0.key === 'shell' && u0.chapter === 14 && u0.cur === 'shell' && warns.some((w) => /'wound' is not in this build; continuing from 'shell'/.test(w)), { u0: [u0.key, u0.chapter, u0.state, u0.room], warns: warns.slice(0, 3) });

await ctx.close();
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
