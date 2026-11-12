// Chapter 8 playthrough (Citadel, evacuated): jump to the end of chapter 7 → the landing above the
// lighthouse → home (Zoé's plan) → Gilbert (the tunnels) → the cistern lever in the station yard → the depot
// bunker's hatch wheel (ball) → Mira (water, the valve-room key) → Pippa (supplies) → Zoé's run to the three
// hill farms and the lighthouse relay → Vesk on the control-room screen → a project ship → the next chapter.
// CAMPAIGN-6 (story/laneline.js): the list cart seen at the lane's shut water gate on arriving; after the relay, still as
// Zoé, the schedule and the route on the lighthouse path's board, Bram, Hedda and Tobin brought to the landing; as Twinsen,
// the culvert's cock in the pump room (in a kick it is kicked back; in the rest it opens), the gate, the boarding.
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
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); T.talkAll(); return [G.flags.chapterKey, G.room?.id ?? 'out', G.state, T.obj()]; }), (v) => v[0] === 'evacuation' && v[2] === 'play' && v[3].length > 0);
is("the arrival: the lane's water gate is shut over a full culvert, and the list cart was seen to turn away from it (the cut-away skipped with E)", await ev(() => { const L = game.world.laneGate, f = game.flags; return [f.ev_v, !!f.ev_cart, L.gate.open, L.culvert.full, L.cart.group.visible, !!game.story._ev.scene]; }), (v) => v[0] === 1 && v[1] && v[2] === false && v[3] === true && !v[4] && !v[5]);
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
is('the lighthouse relay; Zoé stays on: the cart\'s schedule on the board is next', await ev(() => { const G = game; { const Gp = G.story.chapters.find((c) => c.key === 'evacuation').gather; T.tp(Gp.x, Gp.z + 1); } for (let i = 0; i < 60 && !G.flags.c8_relay; i++) { G.step(0.1); T.talkAll(); } G.step(1); return [G.flags.c8_relay, G.hero.body, T.obj(), !!G.flags.c8_zoeDone]; }), (v) => v[0] === true && v[1] === 'zoe' && /schedule/i.test(v[2]) && !v[3]);
is('the board: the schedule, then the route; the lane is on one and crossed off the other; Pippa goes to the landing', await ev(() => { const G = game, f = G.flags, B = G.world.laneGate.board, out = [];
  for (const s of [B.sched, B.route]) { T.tp(s.front.x, s.front.z, Math.PI); G.step(0.3); out.push(G.findInteractable()?.kind); T.tap('KeyE'); G.step(0.3); T.talkAll(); T.talkAll(); }
  const pp = T.npc('pippa'), L = G.world.laneGate.landing; return [...out, !!f.ev_s, !!f.ev_r, !!f.ev_sched, +Math.hypot(pp.pos.x - L.x, pp.pos.z - L.z).toFixed(1), T.obj()]; }),
  (v) => v[0] === 'ev_sched' && v[1] === 'ev_route' && v[2] && v[3] && v[4] && v[5] < 3 && /landing/i.test(v[6]));
await shot('C8-03b-board.png');
is('Zoé tells Bram, then Hedda and Tobin; they walk to the landing', await ev(() => { const G = game, f = G.flags, L = G.world.laneGate.landing; T.talk('bram'); T.talk('ev_hedda'); for (let i = 0; i < 300 && G.story._ev.walks.size; i++) G.step(0.1);
  const d = (id) => +Math.hypot(T.npc(id).pos.x - L.x, T.npc(id).pos.z - L.z).toFixed(1); return [!!f.ev_bram, !!f.ev_hedda, d('bram'), d('ev_hedda'), d('ev_tobin'), L.bundles.visible, T.obj()]; }),
  (v) => v[0] && v[1] && v[2] < 2.5 && v[3] < 2.5 && v[4] < 2.5 && v[5] && /landing/i.test(v[6]));
is('Zoé at the landing: back to Twinsen; Bram knows the float gate; the pump room is next', await ev(() => { const G = game, f = G.flags, L = G.world.laneGate.landing; T.tp(L.x + 2.2, L.z + 0.6); for (let i = 0; i < 80 && !(f.c8_zoeDone && G.hero.body === 'twinsen' && G.state === 'play'); i++) { G.step(0.1); T.talkAll(); }
  return [!!f.c8_zoeDone, G.hero.body, !!f.ev_landing, T.obj(), G.world.laneGate.gate.open]; }), (v) => v[0] && v[1] === 'twinsen' && v[2] && /water gate/i.test(v[3]) && v[4] === false);
await shot('C8-03c-landing.png');
is("the pump room: the culvert's pipe looked at; its cock turned in a kick is kicked back (the gate stays shut)", await ev(() => { const G = game, f = G.flags; const r = T.door(G.world.pumpKiosk.door); T.talkAll(); const U = G.room?.pump; if (!U) return [r];
  const c = U.culvert; T.tp(c.front.x, c.front.z, c.a); G.step(0.3); const k1 = G.findInteractable()?.kind; T.tap('KeyE'); G.step(0.4); T.talkAll();
  for (let i = 0; i < 200 && !(U.phase() > 0.1 && U.phase() < 0.3); i++) G.step(1 / 60); const k2 = G.findInteractable()?.kind; T.tap('KeyE'); G.step(1.6); T.talkAll();
  return [r, k1, !!f.ev_seen, k2, f.ev_kick || 0, !!f.ev_gate, c.open, G.world.laneGate.gate.open, U.surge]; }),
  (v) => v[0] === 'pumproom' && v[1] === 'ev_culvert' && v[2] && v[3] === 'ev_cock' && v[4] >= 1 && !v[5] && !v[6] && v[7] === false && v[8] === true);
is('...in the rest it turns: the culvert drains down the copper pipe, the float drops, the gate opens', await ev(() => { const G = game, f = G.flags, U = G.room.pump, c = U.culvert;
  for (let i = 0; i < 200 && !(U.phase() > 1.0 && U.phase() < 1.2); i++) G.step(1 / 60); T.tap('KeyE'); G.step(1.4); for (let i = 0; i < 40 && G.state === 'play' && !f.ev_gate; i++) G.step(0.1); G.step(2.5); T.talkAll();
  const L = G.world.laneGate; return [!!f.ev_gate, c.open, L.gate.open, L.culvert.full, T.obj()]; }),
  (v) => v[0] && v[1] && v[2] && v[3] === false && /landing/i.test(v[4]));
is('up in the lane: the cart comes in through the open gate; Bram, Hedda, Tobin and Pippa board; then they stand on the bridge', await ev(() => { const G = game, f = G.flags; T.exit('pump-out'); let t = 0, seen = false, inLane = false;
  while (!(f.ev_board && G.state === 'play') && t < 80) { const C = G.world.laneGate.cart; if (C.group.visible) { seen = true; if (C.z > 61) inLane = true; } if (G.state === 'dialog') T.talkAll(); else { G.step(0.1); t += 0.1; } }
  const B = G.world.spaceport.bridge, d = (id) => +Math.hypot(T.npc(id).pos.x - B.x1, T.npc(id).pos.z - B.z).toFixed(1);
  return [!!f.ev_board, seen, inLane, d('bram'), d('ev_hedda'), d('ev_tobin'), d('pippa') < 25, T.npc('worker').present, G.world.laneGate.cart.group.visible, T.obj()]; }),
  (v) => v[0] && v[1] && v[2] && v[3] < 9 && v[4] < 9 && v[5] < 9 && v[6] && v[7] && !v[8] && /control/i.test(v[9]));
is('the control room: Vesk, an objective set', await ev(() => { const r = T.door(game.world.station.control.door); game.step(0.5); T.talkAll(); return [r, game.flags.c8_vesk, T.obj()]; }), (v) => v[0] === 'control' && v[1] === true && v[2].length > 0);
// (PLANET-1: the project ships leave from Citadel Spaceport; Zeelich is another planet)
is('chapter 8 ends on a project ship: the next chapter (council) on Zeelich, at its spaceport', await ev(() => { T.out(); const p = game.world.spaceport.pad; T.tp(p.x - 4.2, p.z, Math.PI / 2); const it = game.findInteractable()?.kind; T.tap('KeyE'); game.step(1.5); T.talkAll(); const L = game.rooms.zeelich.spaceport.landing, h = game.hero; return [it, game.flags.c8_done, game.flags.chapterKey, game.room?.id ?? 'out', +Math.hypot(h.pos.x - L.x, h.pos.z - L.z).toFixed(1)]; }), (v) => v[0] === 'c8ship' && v[1] === true && v[2] === 'council' && v[3] === 'zeelich' && v[4] < 3);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
