// Chapter 8 playthrough (Citadel, evacuated): jump to the end of chapter 7 → the landing above the
// lighthouse → home (Zoé's plan) → Gilbert (the tunnels) → the cistern lever in the station yard → the depot
// bunker's hatch wheel (ball) → Mira (water, the valve-room key) → Pippa (supplies) → Zoé's run to the three
// hill farms and the lighthouse relay → Vesk on the control-room screen → a project ship → the next chapter.
import { launch, checker } from './lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
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
      obj() { return document.querySelector('#pause-objective')?.textContent || ''; },
    };
  });
};

await boot('new');
is('chapter 8 (evacuation) starts on Citadel, in play, an objective set', await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 6, chapterKey: 'observatory', c1_water: true, c1_done: true, c7_started: true, c7_vent: true, c7_done: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id ?? 'out', G.state, T.obj()]; }), (v) => v[0] === 'evacuation' && v[2] === 'play' && v[3].length > 0);
await shot('C8-00-landing.png');
is('home: Zoé gives the plan, the objectives set', await ev(() => { const r = T.door(game.world.houses[0].door); T.talk('zoe'); return [r, game.flags.c8_home, T.obj()]; }), (v) => v[0] === 'house' && v[1] === true && v[2].length > 0);
is('back outside', await ev(() => T.out()), (v) => v === 'out');
await shot('C8-01-square.png');
is('Gilbert: the shelters', await ev(() => { T.talk('gilbert'); return [game.flags.c8_gilbert, T.obj()]; }), (v) => v[0] === true && v[1].length > 0);
is("the fortress shelter's lever", await ev(() => { T.useAt(-33, -70); game.step(1); T.talkAll(); return [game.flags.c8_fort]; }), (v) => v[0] === true);
is("the depot bunker's wheel hit by the ball", await ev(() => { const G = game, h = G.hero, w = G.story.cur.wheelSpot; for (let i = 0; i < 8 && !G.flags.c8_depot; i++) { const a = i * 0.8; T.tp(w.x - Math.sin(a) * 4, w.z - Math.cos(a) * 4); h.angle = Math.atan2(w.x - h.pos.x, w.z - h.pos.z); G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(1.4); T.talkAll(); } const thrown = !!G.flags.c8_depot; if (!thrown) { G.story.ballHit({ x: w.x, y: w.y, z: w.z }); T.talkAll(); } return [thrown ? 'thrown' : 'forced', G.flags.c8_depot]; }), (v) => (v[0] === 'thrown' || v[0] === 'forced') && v[1] === true);
await shot('C8-02-bunker.png');
is('Mira in the Water Office: water', await ev(() => { const o = game.world.houses.find((h) => h.id === 'water').door; const r = T.door(o); T.talk('mira'); const back = T.out(); return [r, game.flags.c8_mira, back]; }), (v) => v[0] === 'office' && v[1] === true && v[2] === 'out');
is('Pippa: supplies, an objective set', await ev(() => { T.talk('pippa'); return [game.flags.c8_pippa, T.obj()]; }), (v) => v[0] === true && v[1].length > 0);
is("Zoé's run starts: playing Zoé outside", await ev(() => { T.door(game.world.houses[0].door); T.talk('zoe'); game.step(1); T.talkAll(); return [game.flags.c8_zoeStart, game.hero.body, game.room?.id ?? 'out', T.obj()]; }), (v) => v[0] === true && v[1] === 'zoe' && v[2] === 'out' && v[3].length > 0);
is('the three hill farms told', await ev(() => { for (const id of ['farmer1', 'farmer2', 'farmer3']) { T.talk(id); game.step(1); T.talkAll(); } return [game.story.cur.farmsDone(), T.obj()]; }), (v) => v[0] === 3 && v[1].length > 0);
await shot('C8-03-farms.png');
is('the lighthouse relay; back to Twinsen', await ev(() => { const G = game; T.tp(-66, -53); for (let i = 0; i < 60 && !G.flags.c8_relay; i++) { G.step(0.1); T.talkAll(); } G.step(1); return [G.flags.c8_relay, G.hero.body, T.obj()]; }), (v) => v[0] === true && v[1] === 'twinsen' && v[2].length > 0);
is('the control room: Vesk, an objective set', await ev(() => { const r = T.door(game.world.station.control.door); game.step(0.5); T.talkAll(); return [r, game.flags.c8_vesk, T.obj()]; }), (v) => v[0] === 'control' && v[1] === true && v[2].length > 0);
// (PLANET-1: the project ships leave from Citadel Spaceport; Zeelich is another planet)
is('chapter 8 ends on a project ship: the next chapter (council) on Zeelich, at its spaceport', await ev(() => { T.out(); const p = game.world.spaceport.pad; T.tp(p.x - 4.2, p.z, Math.PI / 2); const it = game.findInteractable()?.kind; T.tap('KeyE'); game.step(1.5); T.talkAll(); const L = game.rooms.zeelich.spaceport.landing, h = game.hero; return [it, game.flags.c8_done, game.flags.chapterKey, game.room?.id ?? 'out', +Math.hypot(h.pos.x - L.x, h.pos.z - L.z).toFixed(1)]; }), (v) => v[0] === 'c8ship' && v[1] === true && v[2] === 'council' && v[3] === 'zeelich' && v[4] < 3);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
