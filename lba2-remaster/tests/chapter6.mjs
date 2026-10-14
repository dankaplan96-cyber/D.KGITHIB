// Chapter 6 playthrough (the Hamalayi): jump to the end of chapter 5 → the glider's landing → the dead tree
// across the gorge (ball) → Lhar, Yorna → the heating station (no fuse) → Pim's kite on the icefall (ball) →
// the fuse, the winch thaws → two trips up the cliff with ice mites in between → the last ride → the
// monastery → the next chapter.
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
      f() { return { ...G.flags }; },
      obj() { return document.querySelector('#objective')?.textContent || ''; },
    };
  });
};

await boot('new');
log('start', await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 4, chapterKey: 'steam', c5_planned: true, c5_vent: true, c5_glider: true, c5_done: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id, G.state, T.obj()]; }));
await shot('C6-00-landing.png');
log('tree', await ev(() => { const tg = game.room.ballTargets.find((t) => t.tree); const r = T.hit(tg); game.step(2); T.talkAll(); return [r, game.flags.c6_bridge, T.obj()]; }));
log('cross', await ev(() => { const G = game, t = G.rooms.hamalayi.gorge.tree; const x = t.x - 0.6; let z = t.z + 10; T.tp(x, z); for (let i = 0; i < 80; i++) { G.physics.move(G.hero, 0, -0.2); G.step(0.02); } return [G.hero.pos.z.toFixed(1), G.hero.pos.y.toFixed(2), t.z.toFixed(1)]; }));
log('lhar', await ev(() => { const G = game, L = G.rooms.hamalayi.lhar; T.tp(L.x, L.z + 8); G.step(0.5); T.talkAll(); return [G.flags.c6_lhar, T.obj()]; }));
await shot('C6-01-lhar.png');
log('yorna', await ev(() => { T.talk('yorna'); return [game.flags.c6_yorna, T.obj()]; }));
log('station', await ev(() => { const p = game.rooms.hamalayi.heatPost; T.useAt(p.x, p.z); return [game.flags.c6_needFuse, T.obj()]; }));
log('pim', await ev(() => { T.talk('pim'); return [game.flags.c6_kiteAsk, T.obj()]; }));
log('kite', await ev(() => { const tg = game.room.ballTargets.find((t) => t.kite); return [T.hit(tg), game.flags.c6_kite]; }));
log('fuse', await ev(() => { T.talk('pim'); return [game.flags.c6_fuse, T.obj()]; }));
log('heat', await ev(() => { const p = game.rooms.hamalayi.heatPost; T.useAt(p.x, p.z); game.step(5); T.talkAll(); return [game.flags.c6_heat, game.flags.c6_thawed, T.obj()]; }));
log('lift ready', await ev(() => { T.talk('yorna'); return [game.flags.c6_liftReady, T.obj()]; }));
await shot('C6-02-lift.png');
log('sword + rope', await ev(() => { const G = game, h = G.hero, R = G.story.cur.rope; const before = [h.hasSword, h.combat.weapon]; T.tp(R.x - 1.2, R.z); h.angle = Math.atan2(R.x - h.pos.x, R.z - h.pos.z); G.step(0.2); T.tap('KeyK'); G.step(0.8); T.talkAll(); return [before, G.flags.c6_rope, T.obj()]; }));
log('trip 1', await ev(() => { const G = game, w = G.rooms.hamalayi.lift.winch; T.useAt(w.x, w.z, G.rooms.hamalayi.lift.y0); for (let i = 0; i < 600 && !G.flags.c6_trip1; i++) { G.step(0.05); if (G.state === 'dialog') T.talkAll(); } T.talkAll(); return [G.flags.c6_trip1, T.obj()]; }));
log('mites', await ev(() => { const G = game, h = G.hero; const ms = G.enemies.filter((e) => e.def?.id?.startsWith('imite')); for (const m of ms) for (let i = 0; i < 30 && m.alive; i++) { h.pos.set(m.pos.x - 3, G.physics.groundAt(m.pos.x - 3, m.pos.z), m.pos.z); h.angle = h.angleTo(m); h.hp = h.maxHp; G.ball.state = 'idle'; T.tap('KeyF'); G.step(1.0); } return [ms.length, ms.filter((m) => m.alive).length, T.obj()]; }));
log('trip 2', await ev(() => { const G = game, w = G.rooms.hamalayi.lift.winch; T.useAt(w.x, w.z, G.rooms.hamalayi.lift.y0); for (let i = 0; i < 600 && !G.flags.c6_trip2; i++) { G.step(0.05); if (G.state === 'dialog') T.talkAll(); } T.talkAll(); return [G.flags.c6_trip2, T.obj()]; }));
log('ride up', await ev(() => { const G = game, p = G.rooms.hamalayi.lift.pad; T.tp(p.x, p.z); for (let i = 0; i < 400 && !G.flags.c6_up; i++) G.step(0.05); return [G.flags.c6_up, G.hero.pos.y.toFixed(1), T.obj()]; }));
await shot('C6-03-top.png');
log('to monastery', await ev(() => { const G = game, M = G.rooms.hamalayi.monastery.yard, L = G.rooms.hamalayi.lift.top; T.tp(L.x, L.z - 2, 0, 30); G.step(0.3); const h = G.hero; for (let i = 0; i < 300 && !G.flags.c6_done; i++) { const a = Math.atan2(M.x - h.pos.x, M.z - h.pos.z); G.physics.move(h, Math.sin(a) * 0.15, Math.cos(a) * 0.15); G.step(0.02); } T.talkAll(); G.step(1.5); T.talkAll(); return [G.flags.c6_done, G.flags.chapterKey, Math.round(h.pos.x), Math.round(h.pos.z), Math.round(h.pos.y)]; }));
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
