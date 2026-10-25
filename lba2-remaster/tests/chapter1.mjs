// Chapter 1 playthrough: new game → skip to chapter 1 → every step through the real systems → end screen.
// Also: save mid-chapter, reload with Continue, check the state survived.
import { launch, checker } from './lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 960, height: 540, locale: process.argv[2] || 'he-IL' });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
// a story step's end state, judged (R7-VERDICTS): PASS/FAIL with the values it read
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
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
      obj() { return document.querySelector('#pause-objective')?.textContent || ''; },
    };
  });
};
await boot('new');
// jump straight to chapter 1 (the prologue has its own test, pro.mjs)
await ev(() => { const G = game; T.talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });
is('chapter 1 starts: chapter 1, started, in play', await ev(() => [game.flags.chapter, game.flags.c1_started, game.state, game.room?.id ?? 'out']), (v) => v[0] === 1 && v[1] === true && v[2] === 'play');
await shot('C1-00-start.png');
// home: Zoe + Arthur
await ev(() => { const d = game.world.houses[0].door; T.door(d); T.talk('zoe'); });
is('home: Zoé met in the house, the next objective set', await ev(() => [game.room?.id, game.flags.c1_home, T.obj()]), (v) => v[0] === 'house' && v[1] === true && v[2].length > 0);
await ev(() => { const e = game.room.exits[0]; T.door(e); });
// harbour: the ferry docks, Vesk arrives
await ev(() => { const ps = game.world.pierStart; T.tp(ps.x + 6, ps.z + 2); for (let i = 0; i < 30 * 60 && game.state !== 'dialog'; i++) game.step(1 / 60); });
await shot('C1-01-arrival.png');
await ev(() => T.talkAll());
is('the ferry docks: Vesk arrives and is on the pier', await ev(() => [game.flags.c1_arrived, T.npc('vesk').present, game.state]), (v) => v[0] === true && v[1] === true);
await ev(() => T.talk('vesk'));
is("Vesk's task given, the valves objective set", await ev(() => [game.flags.c1_task, T.obj()]), (v) => v[0] === true && v[1].length > 0);
await shot('C1-02-vesk.png');
// Water Office: pipe map
const hasOffice = await ev(() => !!game.rooms.office);
if (hasOffice) {
  await ev(() => { const h = game.world.houses.find((x) => x.id === 'water'); T.door(h.door); const s = game.room.searches.find((x) => x.id === 'pipemap'); T.tp(s.x, s.z); T.tap('KeyE'); game.step(0.1); T.talkAll(); const e = game.room.exits[0]; T.door(e); });
  is('the Water Office: the pipe map found, back outside', await ev(() => [game.flags.c1_map, game.room?.id ?? 'out']), (v) => v[0] === true && v[1] === 'out');
} else check('the Water Office room exists (the pipe map)', false, 'no office room');
// valves
const valves = await ev(() => (game.world.valves || []).map((v) => ({ id: v.id, kind: v.kind, x: v.x, y: v.y, z: v.z })));
is('three bypass valves to open', valves, (v) => v.length === 3);
for (const v of valves) {
  if (v.kind === 'use') {
    await ev((v) => T.useAt(v.x, v.z), v);
  } else {
    // ball: from a spot ~6 m away, facing the valve, throw (normal behaviour)
    await ev((v) => { const G = game; const a = Math.random() * 6.28; for (let k = 0; k < 16 && !G.world.valves.find((w) => w.id === v.id).open; k++) { const aa = a + k * 0.4; T.tp(v.x + Math.sin(aa) * 6, v.z + Math.cos(aa) * 6); G.hero.angle = Math.atan2(v.x - G.hero.pos.x, v.z - G.hero.pos.z); T.tap('KeyF'); G.step(2.5); } }, v);
  }
  is(`valve ${v.id} (${v.kind}) opened`, await ev((id) => game.world.valves.find((w) => w.id === id).open, v.id), (o) => o === true);
}
// mid-chapter save/load
await ev(() => game.save(false));
const before = await ev(() => JSON.stringify(Object.keys(game.flags).filter((k) => k.startsWith('c1')).sort()));
await boot('continue');
await ev(() => game.step(0.5));
const after = await ev(() => JSON.stringify(Object.keys(game.flags).filter((k) => k.startsWith('c1')).sort()));
is('save → Continue: the chapter-1 flags and the open valves survive', [before === after, await ev(() => (game.world.valves || []).map((v) => v.open).join(','))], (v) => v[0] && /^true(,true)*$/.test(v[1]));
await ev(() => { for (let i = 0; i < 120 && game.state !== 'play'; i++) game.step(0.05); T.talkAll(); });
is('after Continue: the water flows, the station gate opens, an objective set', await ev(() => [game.flags.c1_water, game.world.gate.open, T.obj()]), (v) => v[0] === true && v[1] === true && v[2].length > 0);
// station: Vesk's tour
await ev(() => T.talk('vesk'));
is("Vesk's tour done; Zoé is needed", await ev(() => [game.flags.c1_tour, game.flags.c1_needZoe]), (v) => v[0] === true && v[1] === true);
await ev(() => { T.talk('zoe'); for (let i = 0; i < 300 && game.room?.id !== 'projoffice'; i++) game.step(1 / 30); T.talkAll(); });
is("Zoé's segment starts: playing Zoé in the project office", await ev(() => [game.flags.c1_zoeStart, game.hero.body, game.room?.id]), (v) => v[0] === true && v[1] === 'zoe' && v[2] === 'projoffice');
await shot('C1-03-zoe.png');
// Zoe: search the lockers (watcher may spot her; retry)
await ev(() => { const G = game; for (const id of ['locker1', 'locker2', 'locker3']) { const s = G.room?.searches?.find((x) => x.id === id); if (!s) continue; T.tp(s.x, s.z); G.hero.behaviour = 'discreet'; T.tap('KeyE'); G.step(1.4); T.talkAll(); if (G.flags.c1_plan) break; } });
is('Zoé finds the plan in the lockers', await ev(() => game.flags.c1_plan), (v) => v === true);
await ev(() => { const e = game.room?.exits?.[0]; if (e) T.door(e); T.talkAll(); });
is("Zoé's segment ends: back to Twinsen", await ev(() => [game.flags.c1_zoeDone, game.hero.body, game.room?.id ?? 'out']), (v) => v[0] === true && v[1] === 'twinsen');
// confrontation
await ev(() => { T.talk('vesk'); for (let i = 0; i < 400 && game.state !== 'play'; i++) game.step(1 / 30); T.talkAll(); });
is('the confrontation: Vesk leaves', await ev(() => [game.flags.c1_veskGone, T.npc('vesk').present]), (v) => v[0] === true && v[1] === false);
await shot('C1-04-after.png');
// home: Arthur's radio
await ev(() => { const d = game.world.houses[0].door; T.door(d); T.talk('arthur'); const e = game.room.exits[0]; T.door(e); });
is("Arthur's radio heard, an objective set", await ev(() => [game.flags.c1_radio, T.obj()]), (v) => v[0] === true && v[1].length > 0);
// Doran at the harbour, then the project's ship at Citadel Spaceport (PLANET-1)
await ev(() => { T.talk('doran'); game.step(1.5); });
is('Doran sends him to the spaceport, an objective set', await ev(() => [game.flags.c1_ship, T.obj(), T.npc('doran').pos.x.toFixed(1), T.npc('doran').pos.z.toFixed(1)]), (v) => v[0] === true && v[1].length > 0);
await ev(() => { const p = game.world.spaceport.pad; T.tp(p.x - 4.2, p.z); game.hero.angle = Math.PI / 2; game.step(0.1); T.tap('KeyE'); game.step(1.5); T.talkAll(); game.step(1.5); T.talkAll(); });
is('chapter 1 ends: the ship lands on Zeelich, chapter 2 (zeelich) in play', await ev(() => [game.state, game.flags.chapterKey, game.room?.id]), (v) => v[0] === 'play' && v[1] === 'zeelich' && v[2] === 'zeelich');
await shot('C1-05-end.png');
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
