// Save migration / recovery: old v1 saves load and are backed up; a save in a missing room lands outdoors;
// a corrupt save is set aside (never deleted) and a new game starts with a message.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
async function run(name, save) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
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
await run('corrupt save', { v: 2, hero: 'garbage' });
for (const r of results) console.log(JSON.stringify(r));
await browser.close();
