// Chapter 5 playthrough (Desert Island): jump to the end of chapter 4 → evening in Kesh (the plan, the ferry
// requisitioned) → Brosk's jar, the oasis, the shovel → the buried door → the valve hall (diagram, valves 1, 3,
// 4; FunFrock's drones) → the hangar (glider, roof hatch by ball) → Dallan at the gate → the relief valve and
// the geysers → Tarra, Zoé on the radio → Hesk and the glider → chapter 11 (until chapters 6-10 exist).
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
log('start', await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 3, chapterKey: 'dig', c4_started: true, c4_done: true, c4_pump: true, c4_trust: true, c4_carving: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id, G.state, T.obj()]; }));
await shot('C5-00-kesh.png');
log('jar', await ev(() => { T.talk('dtrader'); return [game.flags.c5_jar, T.obj()]; }));
log('fill', await ev(() => { const e = game.rooms.desert.oasisEdge; T.useAt(e.x, e.z); return [game.flags.c5_water]; }));
log('shovel', await ev(() => { T.talk('dtrader'); return [game.flags.c5_shovel, T.obj()]; }));
log('dig out', await ev(() => { const d = game.rooms.desert.ruins.door; T.useAt(d.x, d.z + 1.2); game.step(1.5); T.talkAll(); return [game.flags.c5_dug, T.obj()]; }));
log('into hall', await ev(() => { const G = game, d = G.rooms.desert.ruins.door; T.tp(d.x, d.z + 1.6); G.step(0.3); T.tp(d.x, d.z); G.step(1.6); T.talkAll(); return G.room?.id; }));
await shot('C5-01-hall.png');
log('diagram', await ev(() => { const A = game.rooms.condA; T.useAt(A.diagram.x, A.diagram.z); return game.flags.c5_diagram; }));
// FunFrock's old trooper guards the hall (LBA1's, kind fclone): beat him first, as a player would
log('trooper', await ev(() => { const G = game, e = G.enemies.find((x) => x.id === 'ffclone1'); if (!e) return 'absent'; for (let k = 0; k < 8 && e.alive; k++) { e.take(2, G.hero.pos); G.step(0.1); } G.step(2.6); return e.alive ? 'standing' : 'down'; }));
log('valves', await ev(() => { const A = game.rooms.condA; for (const id of [1, 3, 4]) { const v = A.valves.find((x) => x.id === id); T.useAt(v.x, v.z); } return [JSON.stringify(game.flags.c5_valves), game.flags.c5_routed, T.obj()]; }));
log('hangar', await ev(() => T.exit('cond-b')));
await shot('C5-02-hangar.png');
log('glider', await ev(() => { const g = game.rooms.condB.glider; T.useAt(g.x, g.z); return game.flags.c5_gliderSeen; }));
log('hatch', await ev(() => { const tg = game.room.ballTargets.find((t) => t.hatch); return [T.hit(tg), game.flags.c5_hatch]; }));
log('out', await ev(() => { T.exit('cond-a'); return T.exit('cond-out'); }));
log('dallan', await ev(() => { T.talk('dallan'); return [game.flags.c5_dallanOK, game.rooms.desert.post.gate.isOpen, T.obj()]; }));
log('relief', await ev(() => { const v = game.rooms.desert.bore.valve; T.useAt(v.x, v.z); return [game.flags.c5_relief, T.obj()]; }));
await shot('C5-03-geysers.png');
log('vent', await ev(() => { const G = game, P = G.rooms.desert.post; T.tp(P.x0 - 6, (P.z0 + P.z1) / 2); for (let i = 0; i < 400 && !G.flags.c5_vent; i++) { G.hero.hp = G.hero.maxHp; G.step(0.05); } T.talkAll(); return [G.flags.c5_vent, T.obj()]; }));
log('tarra', await ev(() => { T.talk('tarra'); T.talkAll(); return [game.flags.c5_clover, game.flags.c5_radio, T.obj()]; }));
log('hesk', await ev(() => { T.talk('hesk'); return [game.flags.c5_glider, T.obj()]; }));
log('to hangar', await ev(() => { const G = game, d = G.rooms.desert.ruins.door; T.tp(d.x, d.z + 1.6); G.step(0.3); T.tp(d.x, d.z); G.step(1.6); T.talkAll(); T.exit('cond-b'); return G.room?.id; }));
log('board', await ev(() => { const G = game, g = G.rooms.condB.glider; T.useAt(g.x, g.z); G.step(2); T.talkAll(); G.step(1.5); T.talkAll(); return [G.flags.c5_done, G.flags.chapterKey, G.room?.id]; }));
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
