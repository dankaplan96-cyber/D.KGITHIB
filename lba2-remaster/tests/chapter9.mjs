// Chapter 9 playthrough (Zeelich, the council): jump to the end of chapter 8 → the dock → Baldino's
// workshop (the petition) → Nara's stamp → Oku's errand (knock the three mill brakes loose with the ball) →
// Oku's stamp → the council house: the clerk → the first hearing → the archive (the coat, the wrong cabinet,
// the master plans) → the second hearing with Dallan → the vote → the next chapter.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
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
      talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0, y = null) { const h = G.hero; h.pos.set(x, y == null ? G.physics.groundAt(x, z) : G.physics.groundAt(x, z, y + 1), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); },
      npc(id) { return G.npcs.find((n) => n.def.id === id); },
      talk(id) { const n = T.npc(id); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05); T.talkAll(); },
      useAt(x, z, y = null) { T.tp(x + 0.9, z + 0.3, 0, y); G.hero.angle = Math.atan2(x - G.hero.pos.x, z - G.hero.pos.z); G.step(0.3); T.tap('KeyE'); G.step(1.6); T.talkAll(); },
      // walk onto an exit and let the room change happen
      exit(to) { const e = G.room.exits.find((x) => x.to === to); if (!e) return 'no exit ' + to; T.tp(e.x, e.z, 0, e.y ?? Math.max(G.hero.pos.y, G.room.deckY ?? -1e9) + 0.5); G.step(1.6); T.talkAll(); return G.room?.id ?? 'out'; },
      // throw at a ball target from a few metres away; fall back to applying the hit
      hit(tg) {
        const h = G.hero;
        for (let i = 0; i < 6 && !tg.done; i++) {
          const a = i * 1.05, r = 3.5;
          T.tp(tg.x - Math.sin(a) * r, tg.z - Math.cos(a) * r);
          h.angle = Math.atan2(tg.x - h.pos.x, tg.z - h.pos.z);
          G.ball.state = 'idle'; h.hp = h.maxHp ?? 10;
          T.tap('Digit1'); T.tap('KeyF'); G.step(1.4); T.talkAll();
        }
        if (tg.done) return 'thrown';
        G.story.ballHit({ x: tg.x, y: tg.y, z: tg.z }); G.step(0.2); T.talkAll();
        return tg.done ? 'forced' : 'FAILED';
      },
      door(d) { T.tp(d.x, d.z + 1.5); G.step(1.2); T.tp(d.x, d.z); G.step(1.2); T.talkAll(); return G.room?.id ?? 'out'; },
      out() { const e = G.room.exits[0]; T.tp(e.x, e.z); G.step(1.6); T.talkAll(); return G.room?.id ?? 'out'; },
      f() { return { ...G.flags }; },
      obj() { return document.querySelector('#objective')?.textContent || ''; },
    };
  });
};

await boot('new');
log('start', await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 7, chapterKey: 'evacuation', c1_water: true, c1_done: true, c2_shield: true, c2_mill_north: true, c8_started: true, c8_vesk: true, c8_done: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id ?? 'out', G.state, T.obj()]; }));
await shot('C9-00-dock.png');
log('street folk (Mosquibees, moles, triangle heads)', await ev(() => ['zbee1', 'zbee2', 'zmole1', 'zmole2', 'ztri1', 'ztri2'].map((id) => { const n = T.npc(id); if (!n) return id + ' missing'; const g = game.physics.groundAt(n.pos.x, n.pos.z, n.pos.y + 1); T.talk(id); return id + (Math.abs(g - n.pos.y) < 0.3 ? ' on the street' : ' OFF THE GROUND') + (game.state === 'play' ? ', talked' : ' STUCK ' + game.state); })));
log('baldino', await ev(() => { const Z = game.rooms.zeelich; const r = T.door(Z.workshopDoor); T.talk('baldino'); const back = T.out(); return [r, game.flags.c9_form, back, T.obj()]; }));
log('nara', await ev(() => { T.talk('nara'); return [game.flags.c9_nara]; }));
log('oku', await ev(() => { T.talk('oku'); return [game.flags.c9_okuAsk, game.rooms.zeelich.mills.map((m) => m.spinning)]; }));
log('mills', await ev(() => { const G = game, f = G.flags; return G.rooms.zeelich.mills.map((m) => T.hit({ ...m.brake, get done() { return !!f['c9_free_' + m.id]; } })).concat([G.story.cur.millsFree()]); }));
await shot('C9-01-mills.png');
log('oku stamp', await ev(() => { T.talk('oku'); return [game.flags.c9_oku, T.obj()]; }));
log('council house', await ev(() => { const r = T.door(game.rooms.zeelich.councilDoor); return [r, T.obj()]; }));
await shot('C9-02-antechamber.png');
log('refused archive', await ev(() => { const r = T.exit('up-archive'); return [r]; }));
log('clerk', await ev(() => { T.talk('clerk'); return [game.flags.c9_clerk, T.obj()]; }));
log('hearing', await ev(() => { const r = T.exit('up-council'); game.step(0.5); T.talkAll(); return [r, game.flags.c9_heard, T.obj()]; }));
await shot('C9-03-council.png');
log('archive', await ev(() => { T.exit('council-out'); const r = T.exit('up-archive'); game.step(0.3); T.talkAll(); return [r, !!game.story.cur.watcher?.active]; }));
await shot('C9-04-archive.png');
log('coat', await ev(() => { const L = game.rooms.archive.locker; T.useAt(L.x, L.z); return [game.flags.c9_coat, game.hero.body, game.hero.disguised]; }));
log('wrong cabinet', await ev(() => { const c = game.rooms.archive.cabinets.find((x) => x.label === 'FERRIES'); T.useAt(c.x, c.z); return [game.flags.c9_plans]; }));
log('plans', await ev(() => { const c = game.rooms.archive.cabinets.find((x) => x.label === 'BORE'); T.useAt(c.x, c.z); return [game.flags.c9_plans, T.obj()]; }));
log('spot test', await ev(() => { const G = game; return [G.story.cur.watcher?.active]; }));
log('back', await ev(() => { const r1 = T.exit('archive-out'); const b = game.hero.body; const r2 = T.exit('up-council'); game.step(0.5); T.talkAll(); for (let i = 0; i < 20; i++) { game.step(0.2); T.talkAll(); } return [r1, b, r2, game.flags.c9_vote, game.flags.chapterKey]; }));
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
