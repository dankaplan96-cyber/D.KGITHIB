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
await boot('new');
// jump to chapter 2 (prologue and chapter 1 have their own tests)
await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });
is('chapter 2 (zeelich) starts on Zeelich, in play, an objective set', await ev(() => [game.flags.chapter, game.flags.c2_started, game.room?.id, game.state, T.obj()]), (v) => v[0] === 2 && v[1] === true && v[2] === 'zeelich' && v[3] === 'play' && v[4].length > 0);
await shot('C2-00-arrive.png');
const Zt = (code) => ev(code);
// Baldino (in his workshop if the room exists)
await ev(() => { const G = game, Z = G.rooms.zeelich;
  if (G.rooms.workshop) { T.tp(Z.workshopDoor.x, Z.workshopDoor.z + 0.01); G.step(1.5); T.talkAll(); }
  T.talk('baldino'); });
is('Baldino in his workshop: the plan for the override key, an objective set', await ev(() => [game.room?.id, game.flags.c2_plan, T.obj()]), (v) => v[1] === true && v[2].length > 0);
await shot('C2-01-baldino.png');
// back outside (exit the workshop through its door)
await ev(() => { const G = game; if (G.room?.id === 'workshop') { const e = G.room.exits[0]; T.tp(e.x, e.z); G.step(1.5); T.talkAll(); } });
is('back out on Zeelich', await ev(() => [game.room?.id, game.hero.pos.x.toFixed(1), game.hero.pos.z.toFixed(1)]), (v) => v[0] === 'zeelich');
is('the setback: the plan is taken', await ev(() => [game.flags.c2_planTaken, game.story.items().map((i) => i.id).join(',')]), (v) => v[0] === true);
// the cog on top of the old mill (teleport up: the climb itself is checked by reach tests)
await ev(() => { const G = game, mt = G.rooms.zeelich.millTop, h = G.hero; h.pos.set(mt.x + 0.6, G.physics.groundAt(mt.x + 0.6, mt.z, mt.y + 1), mt.z); h.onGround = true; h.vel.set(0, 0); h.angle = Math.atan2(-0.6, 0); G.step(0.1); T.tap('KeyE'); G.step(1.5); T.talkAll(); });
is("the cog can't be taken before Oku agrees", await ev(() => game.flags.c2_cog), (v) => !v);
// the code cylinder from the depot locker
await ev(() => { const G = game, L = G.rooms.zeelich.depot.locker; T.tp(L.x + 0.9, L.z); G.hero.angle = Math.atan2(-0.9, 0); T.tap('KeyE'); G.step(1.6); T.talkAll(); });
is('the code cylinder from the depot locker', await ev(() => [game.flags.c2_cyl, T.obj()]), (v) => v[0] === true);
is('the plan back', await ev(() => [game.flags.c2_planBack, game.story.items().map((i) => i.id).join(',')]), (v) => v[0] === true);
is('Oku is there and the talk prompt is his', await ev(() => { const G = game, n = T.npc('oku'); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.05); const it = G.findInteractable?.(); return [n.present, n.pos.x.toFixed(1), n.pos.z.toFixed(1), it?.kind, it?.npc?.def?.id, it?.label]; }), (v) => v[0] === true && v[3] === 'npc' && v[4] === 'oku');
is('Oku agrees', await ev(() => { const G = game, n = T.npc('oku'); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05); const st = [G.state, document.querySelector('#dialog')?.textContent?.slice(0, 80)]; T.talkAll(); return [...st, G.state, G.flags.c2_okuOK, G.flags.c2_planBack, G.flags.chapter]; }), (v) => v[3] === true);
await ev(() => { T.talk('nara'); });
is('Oku agreed; Nara saw', await ev(() => [game.flags.c2_okuOK, game.flags.c2_naraSaw]), (v) => v[0] === true && v[1] === true);
// the cog on top of the old mill (teleport up: the climb itself is checked by reach tests)
await ev(() => { const G = game, mt = G.rooms.zeelich.millTop, h = G.hero; h.pos.set(mt.x + 0.6, G.physics.groundAt(mt.x + 0.6, mt.z, mt.y + 1), mt.z); h.onGround = true; h.vel.set(0, 0); h.angle = Math.atan2(-0.6, 0); G.step(0.1); T.tap('KeyE'); G.step(1.5); T.talkAll(); });
is('the cog from the old mill', await ev(() => game.flags.c2_cog), (v) => v === true);
// brake the three mills with the ball
for (let i = 0; i < 3; i++) {
  await ev((i) => { const G = game, m = G.rooms.zeelich.mills[i], b = m.brake;
    for (let k = 0; k < 12 && !G.flags['c2_mill_' + m.id]; k++) { const a = k * 0.55; const x = b.x + Math.sin(a) * 5, z = b.z + Math.cos(a) * 5; T.tp(x, z); G.hero.angle = Math.atan2(b.x - x, b.z - z); T.tap('KeyF'); G.step(2.2); T.talkAll(); } }, i);
}
is('the three mills braked by the ball', await ev(() => game.rooms.zeelich.mills.map((m) => [m.id, !!game.flags['c2_mill_' + m.id], m.spinning])), (v) => v.length === 3 && v.every((m) => m[1] && !m[2]));
// key + Zoe
await ev(() => { const G = game, Z = G.rooms.zeelich; if (G.rooms.workshop) { T.tp(Z.workshopDoor.x, Z.workshopDoor.z + 0.01); G.step(1.5); T.talkAll(); } T.talk('baldino'); for (let i = 0; i < 120 && G.trans; i++) G.step(1 / 30); G.step(0.5); T.talkAll(); });
is("the override key made; Zoé's segment in the lighthouse top", await ev(() => [game.flags.c2_key, game.flags.c2_zoeStart, game.room?.id, game.hero.body]), (v) => v[0] === true && v[1] === true && v[2] === 'lighttop' && v[3] === 'zoe');
await shot('C2-02-zoe.png');
await ev(() => { const G = game, R = G.room; if (R?.id !== 'lighttop') return;
  const use = (id, n = 1) => { const s = R.searches.find((x) => x.id === id); for (let k = 0; k < n; k++) { T.tp(s.x, s.z); T.tap('KeyE'); G.step(0.1); T.talkAll(); } };
  // dials start at [1,2,0] (wave, star, sun): wrong first, then set sun/wave/star
  use('mic');
  use('dial1', 2); use('dial2', 2); use('dial3', 2);
  use('mic'); for (let i = 0; i < 160 && (G.trans || G.state !== 'play'); i++) { G.step(1 / 30); T.talkAll(); } });
is('the broadcast sent; back to Twinsen, an objective set', await ev(() => [game.flags.c2_broadcast, game.room?.id, game.hero.body, T.obj()]), (v) => v[0] === true && v[2] === 'twinsen' && v[3].length > 0);
// mid-chapter save/load
await ev(() => { if (game.room?.id === 'workshop') { const e = game.room.exits[0]; T.tp(e.x, e.z); game.step(1.5); T.talkAll(); } game.save(false); });
const before = await ev(() => JSON.stringify(Object.keys(game.flags).filter((k) => k.startsWith('c2')).sort()));
await boot('continue');
await ev(() => { game.step(0.5); T.talkAll(); });
const after = await ev(() => JSON.stringify(Object.keys(game.flags).filter((k) => k.startsWith('c2')).sort()));
is('save → Continue: the chapter-2 flags survive, the mills stay braked', [before === after, ...await ev(() => [game.room?.id, game.rooms.zeelich.mills.map((m) => m.spinning).join(',')])], (v) => v[0] && v[2] === 'false,false,false');
// console → shield
await ev(() => { const G = game, c = G.rooms.zeelich.platform.console; T.tp(c.x - 1.0, c.z); G.hero.angle = Math.atan2(1, 0); T.tap('KeyE'); G.step(1.8); T.talkAll(); });
is('the platform shield opened (switched off) at the console', await ev(() => [game.flags.c2_shield, game.rooms.zeelich.platform.shield.on, T.obj()]), (v) => v[0] === true && v[1] === false);
await shot('C2-03-shield.png');
// Vesk
await ev(() => { T.talk('vesk'); if (game.state === 'play' && !game.flags.c2_veskDown) { game.input.taps.add('KeyE'); game.step(1 / 60); } for (let i = 0; i < 900 && !game.flags.c2_veskDown; i++) { if (game.state === 'dialog') { game.input.taps.add('KeyE'); } game.step(1 / 30); } T.talkAll(); });
is('Vesk confronted and down', await ev(() => [game.flags.c2_veskDown, T.npc('vesk').present, T.obj(), game.state, T.npc('vesk').pos.toArray().map((v) => +v.toFixed(1)), game.hero.pos.toArray().map((v) => +v.toFixed(1)), game.findInteractable()?.npc?.def?.id]), (v) => v[0] === true);
await ev(() => { const G = game, p = G.rooms.zeelich.platform.pad; T.tp(p.x + 1, p.z); T.tap('KeyE'); G.step(1.5); });
is('chapter 2 done: the next chapter (dig) in play, an objective set', await ev(() => { T.talkAll(); game.step(1.5); T.talkAll(); return [game.state, game.flags.c2_done, game.flags.chapterKey, game.room?.id, T.obj()]; }), (v) => v[1] === true && v[2] === 'dig' && v[0] === 'play' && v[4].length > 0);
await shot('C2-04-end.png');
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
