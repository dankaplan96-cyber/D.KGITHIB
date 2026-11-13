// Save migration / recovery: old v1 saves load and are backed up; a save in a missing room lands outdoors;
// a corrupt save is set aside (never deleted) and a new game starts with a message. A format-4 save from before the
// final chapter was split in two (The Shell, The Core) loads into the right half: the core room or a begun fight →
// chapter 12; Sendell's chamber and earlier → chapter 11; the epilogue keeps its place (its position moved one on).
// SHAFT-CITADEL: a save on Zeelich's drill platform during The Shell comes out at the shaft's new top, Citadel's station.
// CAMPAIGN-5: saves made on the build before wave 3 (tests/fixtures/campaign base-09, base-09-trip1, base-10-scope) load
// without an error; the line's thread is on only where its steps are still ahead (the trips; the telescope).
// CAMPAIGN-6: saves made on the build before wave 4 (base-11 chapter 8 at its start, base-11-town with the town's shelters
// open, base-11-relay with Zoé's run behind it) load without an error; the lane's thread is on only where the relay is
// still ahead, and the arrival counts as seen once he has been home.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker, expectError } from './lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const fixture = (name) => JSON.parse(JSON.parse(fs.readFileSync(fileURLToPath(new URL(`./fixtures/campaign/${name}.save.json`, import.meta.url)), 'utf8')).origins[0].localStorage.find((e) => e.name === 'lba3_save_v1').value);
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
    const st = game.world.station, h = game.hero;
    return { state: game.state, room: game.room?.id || null, chapter: game.flags.chapter, chapterKey: game.flags.chapterKey, cur: game.story.cur.key, keys: ls, savedV: cur?.v ?? null, toast: document.querySelector('#toast')?.textContent?.slice(0, 80),
      ps: [!!game.flags.ps_v, !!game.flags.ob_v, !!game.regions?.built('hamalayi')?.line?.active],
      ev: [!!game.flags.ev_v, !!game.flags.ev_cart, game.world.laneGate ? game.world.laneGate.gate.open : null],
      nw: [game.flags.nw_v ?? null, game.flags.nw_irsa ?? null, game.flags.nw_mira ?? null, game.flags.nw_zoe ?? null, game.flags.nw_ilka ?? null, game.flags.nw_yorna ?? null, game.flags.nw_arthur ?? null, !!game.flags.c10_started],
      cn: [game.flags.cn_v ?? null, game.flags.cn_closed ?? null, game.flags.cn_kell ?? null, game.flags.cn_log ?? null, !!game.flags.c9_vote, !!game.rooms.upper?.order?.shown],
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
await run('wave-3 base: chapter 6 at the landing', fixture('base-09'));
await run('wave-3 base: chapter 6 between the trips', fixture('base-09-trip1'));
await run('wave-3 base: chapter 7 with the telescope turned', fixture('base-10-scope'));
await run('wave-4 base: chapter 8 at its start', fixture('base-11'));
await run('wave-4 base: chapter 8, the town in its shelters', fixture('base-11-town'));
await run('wave-4 base: chapter 8, Zoé\'s run behind it', fixture('base-11-relay'));
await run('wave-5 base: chapter 9 at its start', fixture('base-12'));
await run('wave-5 base: chapter 9 after the hearing', fixture('base-12-heard'));
await run('wave-5 base: chapter 9 with the plans in hand', fixture('base-12-plans'));
await run('wave-6 base: chapter 10 at its start', fixture('base-13'));
await run('wave-6 base: chapter 10 on Citadel, the mill done', fixture('base-13-cit'));
await run('wave-6 base: chapter 10 on Desert Island, three stations done', fixture('base-13-desert'));
for (const r of results) console.log(JSON.stringify(r));
const [[, a], [, b], [, c], [, d4core], [, d4sendell], [, d4gallery], [, d4fight], [, d4home], [, e5plat], [, e5shaft], [, e5street], [, f6, f6e], [, f6t, f6te], [, f7s, f7se], [, g8, g8e], [, g8t, g8te], [, g8r, g8re], [, h9, h9e], [, h9h, h9he], [, h9p, h9pe]] = results;
check('a chapter-9 save from before wave 5, at its start, loads without an error; the stop is ahead, so the thread is on, none of its steps past', ['play', 'dialog'].includes(h9.state) && h9.cur === 'council' && h9.cn[0] === 1 && !h9.cn[1] && !h9.cn[2] && !h9.cn[3] && h9e === 'no errors', [h9, h9e]);
check('a chapter-9 save from before wave 5, after the hearing, loads without an error; the thread is on, Vesk\'s order up beside the archive\'s door, nothing past', ['play', 'dialog'].includes(h9h.state) && h9h.cur === 'council' && h9h.cn[0] === 1 && !h9h.cn[1] && !h9h.cn[2] && h9h.cn[5] && h9he === 'no errors', [h9h, h9he]);
check('a chapter-9 save from before wave 5, the plans in hand, loads without an error; the gallery and the log count as done (past), the vote still ahead', ['play', 'dialog'].includes(h9p.state) && h9p.cur === 'council' && h9p.cn[0] === 1 && h9p.cn[2] === 'past' && h9p.cn[3] === 'past' && !h9p.cn[4] && h9pe === 'no errors', [h9p, h9pe]);
check('a chapter-8 save from before wave 4, at its start, loads without an error; the lane is ahead, so its thread is on and the arrival plays (the cart at the shut gate)', ['play', 'dialog', 'cutscene'].includes(g8.state) && g8.cur === 'evacuation' && g8.ev[0] && g8.ev[2] === false && g8e === 'no errors', [g8, g8e]);
check('a chapter-8 save from before wave 4, the town in its shelters, loads without an error; the thread is on, the arrival counts as seen (he has been home)', ['play', 'dialog'].includes(g8t.state) && g8t.cur === 'evacuation' && g8t.ev[0] && g8t.ev[1] && g8t.ev[2] === false && g8te === 'no errors', [g8t, g8te]);
check('a chapter-8 save from before wave 4, Zoé\'s run behind it, loads without an error; the lane counts as done (no thread, the gate open)', ['play', 'dialog'].includes(g8r.state) && g8r.cur === 'evacuation' && !g8r.ev[0] && g8r.ev[2] === true && g8re === 'no errors', [g8r, g8re]);
check('a chapter-6 save from before wave 3, at the landing, loads into play without an error; the trips are ahead, so the line\'s thread is on', ['play', 'dialog'].includes(f6.state) && f6.cur === 'pass' && f6.ps[0] && f6e === 'no errors', [f6, f6e]);
check('a chapter-6 save from before wave 3, between the trips, loads without an error; the line\'s steps count as done (no thread, the line still)', ['play', 'dialog'].includes(f6t.state) && f6t.cur === 'pass' && !f6t.ps[0] && !f6t.ps[2] && f6te === 'no errors', [f6t, f6te]);
check('a chapter-7 save from before wave 3, the telescope turned, loads without an error; the fourth setting counts as done (no thread)', ['play', 'dialog'].includes(f7s.state) && f7s.cur === 'observatory' && !f7s.ps[1] && f7se === 'no errors', [f7s, f7se]);
check('a v1 save (no lists) loads into play in chapter project, upgraded, the v1 kept as a backup', a.state === 'play' && a.chapterKey === 'project' && a.cur === 'project' && a.keys.includes('lba3_save_v1_backup_v1') && a.savedV > 1, a);
check('a save in a missing room lands outdoors in play, the old save kept as a backup', b.state === 'play' && b.room === null && b.chapterKey === 'project' && b.keys.includes('lba3_save_v1_backup_v2'), b);
check('a corrupt save is set aside (never deleted), a new game starts with a message', c.keys.includes('lba3_save_v1_unreadable') && c.chapterKey === 'well' && c.chapter === 0 && c.toast.length > 0, c);
check('a v4 save in the core room loads into chapter 12 (The Core), upgraded, the v4 kept as a backup', ['play', 'dialog'].includes(d4core.state) && d4core.room === 'c3core' && d4core.chapterKey === 'core' && d4core.cur === 'core' && d4core.chapter === 11 && d4core.savedV === 5 && d4core.keys.includes('lba3_save_v1_backup_v4'), d4core);
check('a v4 save in Sendell\'s chamber stays in chapter 11 (The Shell)', d4sendell.state === 'play' && d4sendell.room === 'c3sendell' && d4sendell.chapterKey === 'shell' && d4sendell.cur === 'shell' && d4sendell.chapter === 10, d4sendell);
check('a v4 save in the gallery stays in chapter 11 (The Shell)', ['play', 'dialog'].includes(d4gallery.state) && d4gallery.room === 'c3gallery' && d4gallery.cur === 'shell' && d4gallery.chapter === 10, d4gallery);
check('a v4 save with the core fight begun loads into chapter 12 (The Core)', d4fight.state === 'play' && d4fight.cur === 'core' && d4fight.chapter === 11 && d4fight.room === 'c3core', d4fight);
check('a v4 save in the epilogue stays in the epilogue (its position moves from 11 to 12)', d4home.state === 'play' && d4home.chapterKey === 'home' && d4home.cur === 'home' && d4home.chapter === 12, d4home);
check('a v5 save on Zeelich\'s drill platform during The Shell comes out on Citadel beside the station\'s bore, in chapter 11', e5plat.state === 'play' && e5plat.room === null && e5plat.cur === 'shell' && e5plat.bore < 6, e5plat);
check('a v5 save in the shaft\'s room stays there, in chapter 11', ['play', 'dialog'].includes(e5shaft.state) && e5shaft.room === 'c3shaft' && e5shaft.cur === 'shell', e5shaft);
check('a v5 save in Zeelich\'s street during The Shell stays on Zeelich (only the platform moved)', e5street.state === 'play' && e5street.room === 'zeelich' && e5street.cur === 'shell', e5street);
// CAMPAIGN-8 (wave 6): saves made on the build before it (tests/fixtures/campaign base-13, base-13-cit, base-13-desert)
const [[, n10, n10e], [, n10c, n10ce], [, n10d, n10de]] = results.slice(-3);
check('a chapter-10 save from before wave 6, at its start (the workshop), loads without an error; the thread is on, nothing of it past (Irsa\'s lane, Arthur\'s count, every friend\'s takeover ahead)', ['play', 'dialog'].includes(n10.state) && n10.cur === 'network' && n10.nw[0] === 1 && n10.nw.slice(1, 7).every((x) => x === null) && n10e === 'no errors', [n10, n10e]);
check('a chapter-10 save from before wave 6, on Citadel with the mill done, loads without an error; Mill Lane counts as done (past: he has left Zeelich), Arthur\'s count and the Citadel stations ahead', ['play', 'dialog'].includes(n10c.state) && n10c.cur === 'network' && n10c.nw[0] === 1 && n10c.nw[1] === 'past' && n10c.nw[2] === null && n10c.nw[3] === null && n10ce === 'no errors', [n10c, n10ce]);
check('a chapter-10 save from before wave 6, three stations done, loads without an error; Mira, Zoé (Arthur with her in the lamp room) and Ilka count as done (past), the dome ahead', ['play', 'dialog'].includes(n10d.state) && n10d.cur === 'network' && n10d.nw[0] === 1 && n10d.nw[2] === 'past' && n10d.nw[3] === 'past' && n10d.nw[4] === 'past' && n10d.nw[5] === null && n10de === 'no errors', [n10d, n10de]);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
