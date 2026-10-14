// Chapter 1 playthrough: new game → skip to chapter 1 → every step through the real systems → end screen.
// Also: save mid-chapter, reload with Continue, check the state survived.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, locale: process.argv[2] || 'he-IL' });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
const shot = async (n) => { await ev(() => game.renderer.render()); await page.screenshot({ path: n, timeout: 180000 }); };
const boot = async (mode) => {
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  await page.evaluate(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await ev(() => {
    const G = window.game; G.testFreeze = true;
    window.T = {
      tap(c) { G.input.taps.add(c); G.step(1 / 60); },
      talkAll(max = 60) { for (let i = 0; i < max && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0) { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); G.camRig.lba.init = false; G.step(0.1); },
      npc(id) { return G.npcs.find((n) => n.def.id === id); },
      talk(id) { const n = T.npc(id); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.05); T.tap('KeyE'); G.step(0.05); T.talkAll(); },
      useAt(x, z) { T.tp(x + 1.0, z + 0.4); G.hero.angle = Math.atan2(x - G.hero.pos.x, z - G.hero.pos.z); T.tap('KeyE'); G.step(2.0); T.talkAll(); },
      door(d) { T.tp(d.x, d.z + 1.5); G.step(1.2); T.tp(d.x, d.z); G.step(1.2); T.talkAll(); },
      f() { return { ...G.flags }; },
      obj() { return document.querySelector('#objective')?.textContent || ''; },
    };
  });
};
await boot('new');
// jump straight to chapter 1 (the prologue has its own test, pro.mjs)
await ev(() => { const G = game; T.talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });
log('ch1 start', await ev(() => [game.flags.chapter, game.flags.c1_started, game.state, game.room?.id ?? 'out']));
await shot('C1-00-start.png');
// home: Zoe + Arthur
await ev(() => { const d = game.world.houses[0].door; T.door(d); T.talk('zoe'); });
log('home', await ev(() => [game.room?.id, game.flags.c1_home, T.obj()]));
await ev(() => { const e = game.room.exits[0]; T.door(e); });
// harbour: the ferry docks, Vesk arrives
await ev(() => { const ps = game.world.pierStart; T.tp(ps.x + 6, ps.z + 2); for (let i = 0; i < 30 * 60 && game.state !== 'dialog'; i++) game.step(1 / 60); });
await shot('C1-01-arrival.png');
await ev(() => T.talkAll());
log('arrived', await ev(() => [game.flags.c1_arrived, T.npc('vesk').present, game.state]));
await ev(() => T.talk('vesk'));
log('task', await ev(() => [game.flags.c1_task, T.obj()]));
await shot('C1-02-vesk.png');
// Water Office: pipe map
const hasOffice = await ev(() => !!game.rooms.office);
if (hasOffice) {
  await ev(() => { const h = game.world.houses.find((x) => x.id === 'water'); T.door(h.door); const s = game.room.searches.find((x) => x.id === 'pipemap'); T.tp(s.x, s.z); T.tap('KeyE'); game.step(0.1); T.talkAll(); const e = game.room.exits[0]; T.door(e); });
  log('map', await ev(() => [game.flags.c1_map, game.room?.id ?? 'out']));
} else log('map', 'SKIP: no office room');
// valves
const valves = await ev(() => (game.world.valves || []).map((v) => ({ id: v.id, kind: v.kind, x: v.x, y: v.y, z: v.z })));
log('valves', JSON.stringify(valves));
for (const v of valves) {
  if (v.kind === 'use') {
    await ev((v) => T.useAt(v.x, v.z), v);
  } else {
    // ball: from a spot ~6 m away, facing the valve, throw (normal behaviour)
    await ev((v) => { const G = game; const a = Math.random() * 6.28; for (let k = 0; k < 16 && !G.world.valves.find((w) => w.id === v.id).open; k++) { const aa = a + k * 0.4; T.tp(v.x + Math.sin(aa) * 6, v.z + Math.cos(aa) * 6); G.hero.angle = Math.atan2(v.x - G.hero.pos.x, v.z - G.hero.pos.z); T.tap('KeyF'); G.step(2.5); } }, v);
  }
  log('valve', v.id, await ev((id) => game.world.valves.find((w) => w.id === id).open, v.id));
}
// mid-chapter save/load
await ev(() => game.save(false));
const before = await ev(() => JSON.stringify(Object.keys(game.flags).filter((k) => k.startsWith('c1')).sort()));
await boot('continue');
await ev(() => game.step(0.5));
const after = await ev(() => JSON.stringify(Object.keys(game.flags).filter((k) => k.startsWith('c1')).sort()));
log('save/load flags equal', before === after, await ev(() => (game.world.valves || []).map((v) => v.open).join(',')));
await ev(() => { for (let i = 0; i < 120 && game.state !== 'play'; i++) game.step(0.05); T.talkAll(); });
log('water', await ev(() => [game.flags.c1_water, game.world.gate.open, T.obj()]));
// station: Vesk's tour
await ev(() => T.talk('vesk'));
log('tour', await ev(() => [game.flags.c1_tour, game.flags.c1_needZoe]));
await ev(() => { T.talk('zoe'); for (let i = 0; i < 300 && game.room?.id !== 'projoffice'; i++) game.step(1 / 30); T.talkAll(); });
log('zoe start', await ev(() => [game.flags.c1_zoeStart, game.hero.body, game.room?.id]));
await shot('C1-03-zoe.png');
// Zoe: search the lockers (watcher may spot her; retry)
await ev(() => { const G = game; for (const id of ['locker1', 'locker2', 'locker3']) { const s = G.room?.searches?.find((x) => x.id === id); if (!s) continue; T.tp(s.x, s.z); G.hero.behaviour = 'discreet'; T.tap('KeyE'); G.step(1.4); T.talkAll(); if (G.flags.c1_plan) break; } });
log('plan', await ev(() => game.flags.c1_plan));
await ev(() => { const e = game.room?.exits?.[0]; if (e) T.door(e); T.talkAll(); });
log('zoe done', await ev(() => [game.flags.c1_zoeDone, game.hero.body, game.room?.id ?? 'out']));
// confrontation
await ev(() => { T.talk('vesk'); for (let i = 0; i < 400 && game.state !== 'play'; i++) game.step(1 / 30); T.talkAll(); });
log('vesk gone', await ev(() => [game.flags.c1_veskGone, T.npc('vesk').present]));
await shot('C1-04-after.png');
// home: Arthur's radio
await ev(() => { const d = game.world.houses[0].door; T.door(d); T.talk('arthur'); const e = game.room.exits[0]; T.door(e); });
log('radio', await ev(() => [game.flags.c1_radio, T.obj()]));
// Doran: the ferry
await ev(() => { T.talk('doran'); game.step(1.5); });
log('end', await ev(() => [game.state, game.flags.c1_done]));
await shot('C1-05-end.png');
console.log(errs.slice(0, 20).join('\n') || 'no errors');
await browser.close();
