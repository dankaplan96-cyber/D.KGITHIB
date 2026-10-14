// Chapter 3 and epilogue playthrough: jump to the end of chapter 2 → the shaft → the deep installation
// (diagram, ball switch, valves A and C) → the crystal galleries (three pillars, the stones) → Sendell →
// the core (three pylons while the guardian fights) → epilogue dinner → end screen → free roam.
// Ball targets are first tried with a real throw; if a throw misses, the hit is applied directly and the
// log says "forced" (aiming is covered by the earlier tests; this one checks the story can be finished).
// Also: a save taken mid-chapter (after the galleries) reloads with the progress intact.
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
await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });
// finish chapter 2 by its own ending call (chapter 2 has its own test)
await ev(() => { const G = game; Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_mills: true, c2_signal: true });
  G.story.cur.toShell?.(); G.step(1.5); T.talkAll(); G.step(0.5); T.talkAll();
  // chapters between Zeelich and the shell (Desert Island, …) have their own tests: skip to the shell
  for (let i = 0; i < 12 && G.story.cur.key !== 'shell'; i++) { G.story.nextChapter(); G.step(0.5); T.talkAll(); } });
log('ch3 start', await ev(() => [game.flags.chapter, game.flags.c3_started, game.room?.id, game.state, T.obj()]));
await shot('C3-00-shaft.png');

// the deep installation
log('to deep', await ev(() => T.exit('c3-deep')));
await shot('C3-01-deep.png');
log('diagram', await ev(() => { const D = game.room; T.useAt(D.diagram.x, D.diagram.z); return [game.flags.c3_diagram, T.obj()]; }));
log('valve B (wrong)', await ev(() => { const v = game.room.valves.find((x) => x.id === 'B'); T.useAt(v.x, v.z, v.y); return [v.open, game.flags.c3_cooled]; }));
await ev(() => { const v = game.room.valves.find((x) => x.id === 'B'); T.useAt(v.x, v.z, v.y); });
log('valve A', await ev(() => { const v = game.room.valves.find((x) => x.id === 'A'); T.useAt(v.x, v.z, v.y); return [v.open, game.flags.c3_cooled]; }));
log('ball switch', await ev(() => { const tg = game.room.ballTargets.find((x) => x.ballSwitch); return [T.hit(tg), game.flags.c3_ladder]; }));
log('valve C (catwalk)', await ev(() => { const v = game.room.valves.find((x) => x.id === 'C'); T.useAt(v.x, v.z, v.y); return [v.open, game.flags.c3_cooled, game.hero.pos.y.toFixed(2), v.y]; }));
log('cooled', await ev(() => [game.flags.c3_cooled, T.obj()]));
await shot('C3-02-cooled.png');

// the galleries
log('to gallery', await ev(() => T.exit('c3-gallery')));
await shot('C3-03-gallery.png');
log('pillars', await ev(() => game.room.ballTargets.filter((x) => x.pillar != null).map((tg) => T.hit(tg))));
log('stones', await ev(() => [game.flags.c3_pillar0, game.flags.c3_pillar1, game.flags.c3_pillar2, T.obj()]));
await shot('C3-04-stones.png');

// mid-chapter save → reload → Continue
const before = await ev(() => { game.save(false); return JSON.stringify(['c3_cooled', 'c3_ladder', 'c3_pillar0', 'c3_pillar1', 'c3_pillar2'].map((k) => !!game.flags[k])); });
await boot('continue');
const after = await ev(() => { T.talkAll(); return JSON.stringify(['c3_cooled', 'c3_ladder', 'c3_pillar0', 'c3_pillar1', 'c3_pillar2'].map((k) => !!game.flags[k])); });
log('save/load', before === after, after, await ev(() => [game.room?.id, game.flags.chapter, T.obj()]));

// Sendell
log('to sendell', await ev(() => { if (game.room?.id !== 'c3gallery') T.exit('c3-gallery'); return T.exit('c3-sendell'); }));
log('sendell', await ev(() => { T.talkAll(); return [game.flags.c3_sendell, T.obj()]; }));
await shot('C3-05-sendell.png');

// the core: Vesk, the guardian, the pylons
log('to core', await ev(() => { const r = T.exit('c3-core'); T.talkAll(); return [r, game.flags.c3_fight, T.obj()]; }));
log('guardian', await ev(() => { const g = game.story.cur.guardian; return g ? [g.present, g.state, g.alive] : 'none'; }));
log('leave blocked', await ev(() => { const e = game.room.exits[0]; T.tp(e.x, e.z); game.step(1.6); T.talkAll(); return game.room?.id; }));
await shot('C3-06-core.png');
// bank shots: walk onto each pylon's glowing plate (it lines Twinsen up), throw in normal behaviour
log('pylons', await ev(() => game.story.cur.plates().map((p) => {
  const G = game, h = G.hero, tg = G.room.ballTargets.find((x) => x.pylon === p.i);
  for (let k = 0; k < 3 && !tg.done; k++) {
    T.tp(p.x + 0.3, p.z - 0.2, 0); h.hp = h.maxHp; G.step(0.6); // stand still: the plate centres and turns him
    G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(1.6); T.talkAll();
  }
  return tg.done ? 'bank shot' : T.hit(tg);
})));
log('overload', await ev(() => { T.talkAll(); game.step(1); T.talkAll(); const tg = game.room.ballTargets.find((x) => x.coil); return [game.flags.c3_overload, !!tg, T.obj()]; }));
// Vesk's coil: three hits (real throws first, T.hit forces a hit only if the throws miss)
log('coil', await ev(() => { const tg = game.room.ballTargets.find((x) => x.coil); const r = []; for (let k = 0; tg && k < 3 && !tg.done; k++) r.push(T.hit(tg)); T.talkAll(); return [tg ? r : 'no coil', game.flags.c3_coil, tg?.done]; }));
log('turned', await ev(() => { T.talkAll(); game.step(2); T.talkAll(); return [game.flags.c3_turned, game.flags.c3_done, game.flags.chapter, game.room?.id, game.state]; }));

// epilogue: dinner → end screen
log('epilogue', await ev(() => { const G = game; for (let i = 0; i < 10 && G.state !== 'ending'; i++) { G.step(0.5); if (G.state === 'dialog') T.talkAll(); } return [G.flags.chapter, G.flags.ep_dinner, G.state, document.querySelector('#ending h1')?.textContent]; }));
await shot('C3-07-end.png');
const buttons = await ev(() => [...document.querySelectorAll('#ending button')].filter((b) => b.offsetParent).map((b) => b.textContent.trim()));
log('end buttons', buttons);
// keep exploring
log('free roam', await ev(() => { const b = [...document.querySelectorAll('#ending button')].find((x) => x.offsetParent && /explor/i.test(x.textContent)); b?.click(); game.step(0.5); return [game.state, game.flags.ep_free, T.obj()]; }));
log('gilbert', await ev(() => { if (game.room) { const e = game.room.exits[0]; T.tp(e.x, e.z); game.step(1.6); T.talkAll(); } T.talk('gilbert'); return game.state; }));

console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
