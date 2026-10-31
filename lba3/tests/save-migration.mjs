// Save migration / recovery: old v1 saves load and are backed up; a save in a missing room lands outdoors;
// a corrupt save is set aside (never deleted) and a new game starts with a message. A format-4 save from before the
// final chapter was split in two (The Shell, The Core) loads into the right half: the core room or a begun fight →
// chapter 12; Sendell's chamber and earlier → chapter 11; the epilogue keeps its place (its position moved one on).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker, expectError } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
async function run(name, save) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.addInitScript((s) => { localStorage.setItem('lba3_save_v1', s); }, JSON.stringify(save));
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/'), { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 400000 });
  await page.evaluate(() => { game.testFreeze = true; game.act('continue'); for (let i = 0; i < 20; i++) game.step(0.05); });
  const r = await page.evaluate(() => {
    const ls = Object.keys(localStorage).filter((k) => k.startsWith('lba3_save')).sort();
    const cur = JSON.parse(localStorage.getItem('lba3_save_v1') || 'null');
    return { state: game.state, room: game.room?.id || null, chapter: game.flags.chapter, chapterKey: game.flags.chapterKey, cur: game.story.cur.key, keys: ls, savedV: cur?.v ?? null, toast: document.querySelector('#toast')?.textContent?.slice(0, 80) };
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
for (const r of results) console.log(JSON.stringify(r));
const [[, a], [, b], [, c], [, d4core], [, d4sendell], [, d4gallery], [, d4fight], [, d4home]] = results;
check('a v1 save (no lists) loads into play in chapter project, upgraded, the v1 kept as a backup', a.state === 'play' && a.chapterKey === 'project' && a.cur === 'project' && a.keys.includes('lba3_save_v1_backup_v1') && a.savedV > 1, a);
check('a save in a missing room lands outdoors in play, the old save kept as a backup', b.state === 'play' && b.room === null && b.chapterKey === 'project' && b.keys.includes('lba3_save_v1_backup_v2'), b);
check('a corrupt save is set aside (never deleted), a new game starts with a message', c.keys.includes('lba3_save_v1_unreadable') && c.chapterKey === 'well' && c.chapter === 0 && c.toast.length > 0, c);
check('a v4 save in the core room loads into chapter 12 (The Core), upgraded, the v4 kept as a backup', ['play', 'dialog'].includes(d4core.state) && d4core.room === 'c3core' && d4core.chapterKey === 'core' && d4core.cur === 'core' && d4core.chapter === 11 && d4core.savedV === 5 && d4core.keys.includes('lba3_save_v1_backup_v4'), d4core);
check('a v4 save in Sendell\'s chamber stays in chapter 11 (The Shell)', d4sendell.state === 'play' && d4sendell.room === 'c3sendell' && d4sendell.chapterKey === 'shell' && d4sendell.cur === 'shell' && d4sendell.chapter === 10, d4sendell);
check('a v4 save in the gallery stays in chapter 11 (The Shell)', ['play', 'dialog'].includes(d4gallery.state) && d4gallery.room === 'c3gallery' && d4gallery.cur === 'shell' && d4gallery.chapter === 10, d4gallery);
check('a v4 save with the core fight begun loads into chapter 12 (The Core)', d4fight.state === 'play' && d4fight.cur === 'core' && d4fight.chapter === 11 && d4fight.room === 'c3core', d4fight);
check('a v4 save in the epilogue stays in the epilogue (its position moves from 11 to 12)', d4home.state === 'play' && d4home.chapterKey === 'home' && d4home.cur === 'home' && d4home.chapter === 12, d4home);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
