// Chapter 4 playthrough (Desert Island): jump to the end of chapter 3 → the sealed shaft → Kesh (Mother
// Tarra, the wind-pump's three gears) → Hesk, the rope, the sand-yacht → Ilka's camp → the research post in a
// sandstorm (the notebook) → save/reload → the dig (gate code, terraces, three seals) → the carving and
// Dallan → chapter 11. Ball targets are thrown at first; "forced" in the log means a throw missed.
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
// to the end of chapter 3 (Zeelich): the sealed shaft sends Twinsen south
await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });
log('sealed shaft', await ev(() => { const G = game; Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true });
  G.story.cur.toShell(); T.talkAll(); G.step(1.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id, G.state, T.obj()]; }));
await shot('C4-00-arrive.png');
// Kesh: Mother Tarra, the pump
log('tarra', await ev(() => { T.talk('tarra'); return [game.flags.c4_pumpTask, T.obj()]; }));
log('gears', await ev(() => game.room.ballTargets.filter((t) => t.gear != null).map((tg) => T.hit(tg))));
log('pump', await ev(() => { game.step(1); T.talkAll(); return [game.flags.c4_pump, T.obj()]; }));
log('trust', await ev(() => { T.talk('tarra'); return [game.flags.c4_trust, T.obj()]; }));
await shot('C4-01-oasis.png');
// Hesk, the rope, the ride
log('hesk', await ev(() => { T.talk('hesk'); return [game.flags.c4_heskAsk, T.obj()]; }));
log('rope', await ev(() => { const R = game.rooms.desert.rope; T.useAt(R.x, R.z); return [game.flags.c4_rope]; }));
log('ride', await ev(() => { T.talk('hesk'); const G = game; for (let i = 0; i < 400 && G.state !== 'play'; i++) G.step(0.05); return [G.flags.c4_yacht, G.state, Math.round(G.hero.pos.x), Math.round(G.hero.pos.z)]; }));
await shot('C4-02-camp.png');
log('ilka', await ev(() => { T.talk('ilka'); return [game.flags.c4_ilka, T.obj()]; }));
// the research post in a storm
log('storm', await ev(() => { const G = game; for (let i = 0; i < 400 && !G.story.cur.stormy; i++) G.step(0.05); return [G.story.cur.stormy, G.rooms.desert.post.gate.isOpen, G.rooms.desert.storm.level.toFixed(2)]; }));
log('desk', await ev(() => { const P = game.rooms.desert.post; T.tp(P.gate.x + 3, P.gate.z); T.useAt(P.desk.x, P.desk.z); return [game.flags.c4_notebook, T.obj()]; }));
await shot('C4-03-post.png');
// save/reload mid-chapter
const before = await ev(() => { game.save(false); return JSON.stringify(['c4_pump', 'c4_trust', 'c4_rope', 'c4_ilka', 'c4_notebook', 'c4_yacht'].map((k) => game.flags[k] ?? null)); });
await boot('continue');
const after = await ev(() => { T.talkAll(); return JSON.stringify(['c4_pump', 'c4_trust', 'c4_rope', 'c4_ilka', 'c4_notebook', 'c4_yacht'].map((k) => game.flags[k] ?? null)); });
log('save/load', before === after, after, await ev(() => [game.room?.id, game.flags.chapterKey, game.rooms.desert.oasis.level.toFixed(2), T.obj()]));
// the dig
log('gate', await ev(() => { const g = game.rooms.desert.dig.gate; T.useAt(g.x, g.z); return [game.flags.c4_digOpen, T.obj()]; }));
log('down', await ev(() => { const G = game, D = G.rooms.desert.dig; T.tp(D.x + 1.5, D.z - 1.0); G.step(0.5); T.talkAll(); return [G.hero.pos.y.toFixed(2), D.bottomY, G.flags.c4_digSeen]; }));
await shot('C4-04-dig.png');
log('seals', await ev(() => game.room.ballTargets.filter((t) => t.seal != null).map((tg) => T.hit(tg))));
// the seals open the Temple of Bù's gate: walk in, read the great carving inside
log('temple', await ev(() => { const G = game, d = G.rooms.desert.dig.door; G.step(0.5); T.talkAll(); T.tp(d.x, d.z, 0, G.rooms.desert.dig.bottomY); G.step(1.6); T.talkAll(); return [G.room?.id, G.flags.c4_templeSeen, T.obj()]; }));
await shot('C4-05-temple.png');
log('carving', await ev(() => { const G = game, c = G.rooms.butemple.carving; T.useAt(c.x, c.z); G.step(2); T.talkAll(); return [G.flags.c4_carving, G.flags.c4_done]; }));
await shot('C4-05-carving.png');
log('next', await ev(() => { const G = game; G.step(1.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id, T.obj()]; }));
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
