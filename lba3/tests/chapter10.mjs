// Chapter 10 playthrough (Baldino's network): jump to the end of chapter 9 → Baldino's workshop → Oku's mill
// (ball on the brake, climb, the relay) → the spaceship to Citadel (PLANET-1: the planets are joined by spaceship
// only) → Mira's valve room (three valves) → the lighthouse (Zoé, Arthur, the dials) → Hesk's glider to Desert Island
// (Ilka, the relay on the bore, three drones) → the Hamalayi (Pim, Sefa's dome: the relay, the telescope) → the
// glider to Citadel, the spaceship back to Zeelich → the platform console → chapter 11.
// Verdict: CHAPTER 10 DONE only when every ball target (the mill's brake, the three drones) fell to throws; if any
// had to be beaten through its own rule (an ISO assist, logged), the run ends CHAPTER 10 ASSISTED with exit code 2.
import { launch, checker } from './lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
// a story step's end state, judged (R7-VERDICTS): PASS/FAIL with the values it read
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
const assists = [];   // ball targets that did not fall to throws (REV-TY-3 N4)
const MAX_THROWS = +(process.env.C10_MAX_THROWS ?? 120);   // throws per drone before the assist (0 forces it: checks the verdict)
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
      // stand 1.4 m from the NPC facing them and press E: in front of them first, then round them, on the first free
      // spot where the prompt is theirs (so the test does not hang on which way they happen to face; REV-TY-5 T1)
      talk(id) { const n = T.npc(id); const h = G.hero, P = G.physics;
        let spot = null;
        for (let k = 0; k < 12 && !spot; k++) {
          const a = n.angle + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6, x = n.pos.x + Math.sin(a) * 1.4, z = n.pos.z + Math.cos(a) * 1.4;
          if (P.blockedAt(x, z, n.pos.y, 0.3)) continue;
          h.pos.set(x, n.pos.y, z); h.onGround = true; h.vy = 0; h.angle = Math.atan2(n.pos.x - x, n.pos.z - z);
          if (G.findInteractable()?.npc === n) spot = [x, z];
        }
        if (!spot) T.miss.push(id);
        G.step(0.8); h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); T.tap('KeyE'); G.step(0.05); T.talkAll(); },
      miss: [],
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
await ev(() => { T.useOn = (x, z) => { const G = game; T.tp(x, z); G.step(0.2); T.tap('KeyE'); G.step(1.4); T.talkAll(); };
  T.fly = (i) => { const G = game, n = T.npc('hesk'), h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05);
    for (let k = 0; k < 80 && G.state === 'dialog'; k++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.2); if (G.state !== 'shop') return ['no menu: ' + G.state, n.present, +n.pos.x.toFixed(1), +n.pos.z.toFixed(1), +h.pos.x.toFixed(1), +h.pos.z.toFixed(1), G.npcs.filter((m) => m.present && m.distTo(h) < 4).map((m) => m.def.id), G.story.cur.region(), G.room?.id]; document.querySelector(`#shop .item[data-i="${i}"]`).click(); for (let k = 0; k < 30; k++) { G.step(0.1); T.talkAll(); } return G.room?.id ?? 'out'; };
  // the spaceship between the planets (travel.js): stand by the pad, E, the menu's only stop
  T.ship = (pid) => { const G = game, p = G.travel.points[pid], L = p.landing; T.tp((p.x + L.x) / 2, (p.z + L.z) / 2); G.hero.angle = Math.atan2(p.x - G.hero.pos.x, p.z - G.hero.pos.z); G.step(0.3); const it = G.findInteractable(); T.tap('KeyE'); G.step(0.2); if (G.state !== 'shop') return ['no menu: ' + G.state, it?.kind]; const items = [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent); document.querySelector('#shop .item[data-i="0"]').click(); for (let k = 0; k < 30; k++) { G.step(0.1); T.talkAll(); } return [G.room?.id ?? 'out', items]; }; });

is('chapter 10 (network) starts in Baldino\'s workshop, the relays objective set', await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 8, chapterKey: 'council', c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
    c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_zoeDone: true, c9_started: true, c9_vote: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id ?? 'out', G.flags.c10_started, T.obj()]; }), (v) => v[0] === 'network' && v[2] === true && v[3].length > 0);
await shot('C10-00-workshop.png');
is('Oku on Zeelich asks for the mill braked', await ev(() => { T.out(); T.talk('oku'); return [game.room?.id, game.flags.c10_okuAsk]; }), (v) => v[0] === 'zeelich' && v[1] === true);
{ const b = await ev(() => { const G = game, f = G.flags, m = G.rooms.zeelich.mills[0]; return [T.hit({ ...m.brake, get done() { return !!f.c10_millBraked; } }), m.spinning]; });
  check('the mill brake hit (the mill stops)', b[0] === 'thrown' || b[0] === 'forced', b); if (b[0] !== 'thrown') { assists.push('mill brake: ' + b[0]); log('ISO  the mill brake was not hit by a throw: ' + b[0]); } }
is("the old mill's relay set (1/5); the mill turns again", await ev(() => { const mt = game.rooms.zeelich.millTop; T.useAt(mt.x, mt.z, mt.y); return [game.flags.c10_mill, game.rooms.zeelich.mills[0].spinning, T.obj()]; }), (v) => v[0] === true && v[1] === true && v[2].length > 0);   // braked to climb it; src/game/story/network.js: released once the relay is set
await shot('C10-01-mill.png');
is('Hesk is not on Zeelich (no glider to another planet)', await ev(() => [T.npc('hesk')?.present ?? null, game.story.cur.region()]), (v) => v[0] !== true && v[1] === 'zeelich');
is('the spaceship to Citadel', await ev(() => T.ship('zeelich_port')), (v) => v[0] === 'out');
await shot('C10-02-citadel-landing.png');
is('Mira sends him to the valve room', await ev(() => { const o = game.world.houses.find((h) => h.id === 'water').door; const r = T.door(o); T.talk('mira'); game.step(1.5); T.talkAll(); return [r, game.flags.c10_miraAsk, game.room?.id]; }), (v) => v[0] === 'office' && v[1] === true && v[2] === 'valves');
is("the valve room's relay: the three gauges level", await ev(() => { const V = game.rooms.valves; for (const i of [0, 1, 2]) { const v = V.valves[i]; T.useAt(v.x, v.z); } return [game.story.cur.gaugeLevels(), game.flags.c10_valves]; }), (v) => v[0].every((x) => x === v[0][0]) && v[1] === true);
await shot('C10-03-valves.png');
is('out of the valve room and the office', await ev(() => { const a = T.exit('valves-out'); const b = T.out(); return [a, b]; }), (v) => v[1] === 'out');
// REV-TY-5 T1 (for players): standing at the middle dial (a plain search until Zoé has asked) and facing Zoé, E is hers
const facedZoe = await ev(() => { const G = game, h = G.hero; T.door({ x: -107.5, z: 94.2 }); const z = T.npc('zoe'), s = G.rooms.lighttop.searches.find((x) => x.id === 'dial2');
  T.tp(s.x, s.z); h.angle = Math.atan2(z.pos.x - h.pos.x, z.pos.z - h.pos.z); const it = G.findInteractable();
  return it?.npc?.def.id || it?.spot?.id || it?.kind || null; });
log('at the dial facing Zoé, E is for', facedZoe);
is('Zoé at the lighthouse top asks for the dials', await ev(() => { const r = game.room?.id ?? 'out'; const z = T.npc('zoe'); const before = [z.present, +z.pos.x.toFixed(1), +z.pos.z.toFixed(1), game.state]; T.talk('zoe'); return [r, before, game.state, game.flags.c10_zoeAsk, +game.hero.pos.x.toFixed(1), +game.hero.pos.z.toFixed(1)]; }), (v) => v[0] === 'lighttop' && v[1][0] === true && v[2] === 'play' && v[3] === true);
is('the lighthouse dials set, the relay (3/5)', await ev(() => { const L = game.rooms.lighttop; for (const i of [1, 2, 3]) { const s = L.searches.find((x) => x.id === 'dial' + i); for (let k = 0; k < 2; k++) T.useOn(s.x, s.z); } return [game.flags.c10_dials, game.flags.c10_light, T.obj()]; }), (v) => v[1] === true && v[2].length > 0);
await shot('C10-04-lighthouse.png');
is("Hesk's glider to Desert Island", await ev(() => { T.exit('outdoor-lighthouse'); const L = game.story.cur.landing('citadel'); T.tp(L.x, L.z); return T.fly(1); }), (v) => v === 'desert');
await shot('C10-05-desert-landing.png');
is('Ilka; the bore relay set; the drones come', await ev(() => { T.talk('ilka'); const b = game.rooms.desert.bore; T.useAt(b.x, b.z); return [game.flags.c10_ilka, game.flags.c10_boreRelay, game.story.cur.boreDrones().filter((e) => e.present).length]; }), (v) => v[0] === true && v[1] === true && v[2] > 0);
// the bore fight, two waves (DIFFICULTY): the three drones first (they come one after another), then Vesk's clone, the Grobo
// guard and the sentry. Each by throws (the AI uses unseeded Math.random, so an enemy can dodge many throws in a row): each
// throw from a fresh side and distance, aimed again a moment before it leaves the hand (a charged one at an armoured guard,
// a sentry's shield: hold F); up to 120 throws per enemy. Only one still standing after that is beaten through its own damage
// rule, and that is logged as ISO.
await ev(() => { window.beat = (list, MAXT, charged) => { const G = game, h = G.hero, out = [], iso = [];
  for (const d of list) {
    let n = 0;
    for (; n < MAXT && d.alive; n++) {
      const a = Math.PI / 2 + n * 2.4, r = 2.8 + (n % 3) * 0.5, x = d.pos.x - Math.sin(a) * r, z = d.pos.z - Math.cos(a) * r;
      h.pos.set(x, G.physics.groundAt(x, z), z); h.onGround = true; h.vy = 0; h.hp = h.maxHp; h.mp = h.mpMax; G.ball.state = 'idle'; G.combatDir.grace = 0;
      h.angle = h.angleTo(d); G.step(0.05); h.angle = h.angleTo(d);
      if (charged) { G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); G.step(1.3); G.input.keys.delete('KeyF'); G.step(1.0); } else { T.tap('KeyF'); G.step(1.0); }
      if (G.state === 'dialog') T.talkAll();
    }
    if (d.alive) { d.damage(99, null); G.step(0.5); out.push(d.def.id + ': ISO assist after ' + n + ' throws'); iso.push(d.def.id + ' killed by its damage rule after ' + n + ' throws'); } else out.push(d.def.id + ': thrown (' + n + ' throws)');
  }
  return [out, iso]; }; });
const drones = await ev((MAXT) => { const G = game; const r = beat(G.story.cur.boreDrones(), MAXT, false);
  for (let i = 0; i < 20; i++) { G.step(0.2); T.talkAll(); }
  return [...r, G.story.cur.boreDrones().map((d) => d.alive), G.flags.c10_boreW2, G.flags.c10_bore]; }, MAX_THROWS);
is("wave 1 (the drones) beaten: wave 2 is on, the station is not done yet", drones, (v) => v[2].every((a) => a === false) && v[3] === true && !v[4]);
for (const a of drones[1]) { assists.push('drone ' + a); log('ISO  drone ' + a); }
is('the break: a heart and a flask lie by him, the clone is out of the cabin, the guard follows, the sentry holds the gate', await ev(() => { const G = game, lk = G.pickups.list.filter((p) => p.loot).map((p) => p.type + ':' + p.loot);
  G.step(0.5); const vis = Object.fromEntries(G.story.cur.boreGuards().map((e) => [e.def.id, e.present])); return { lk, vis, sentryAtGate: Math.hypot(G.enemies.find((e) => e.def.id === 'nsentry').pos.x - G.rooms.desert.post.gate.x, G.enemies.find((e) => e.def.id === 'nsentry').pos.z - G.rooms.desert.post.gate.z) < 6 }; }),
  (v) => v.lk.some((x) => /^heart:c10-bore-heart/.test(x)) && v.lk.some((x) => /^flask:c10-bore-flask/.test(x)) && v.vis.nclone === true && v.vis.nsentry === true && v.sentryAtGate);
const guards = await ev((MAXT) => { const G = game; const r = beat(G.story.cur.boreGuards(), MAXT, true);
  for (let i = 0; i < 20; i++) { G.step(0.2); T.talkAll(); }
  return [...r, G.story.cur.boreFoes().map((d) => d.alive), G.flags.c10_bore, T.obj()]; }, MAX_THROWS);
is("wave 2 (clone, guard, sentry) beaten, the bore relay done (4/5)", guards, (v) => v[2].every((a) => a === false) && v[3] === true && v[4].length > 0);
for (const a of guards[1]) { assists.push('guard ' + a); log('ISO  guard ' + a); }
await shot('C10-06-bore.png');
is('the glider to the Hamalayi', await ev(() => { const L = game.story.cur.landing('desert'); T.tp(L.x, L.z); return T.fly(2); }), (v) => v === 'hamalayi');
await shot('C10-07-monastery.png');
is('Yorna and Pim', await ev(() => { T.talk('yorna'); return [game.flags.c10_pim]; }), (v) => v[0] === true);
is("the dome's relay (5/5), an objective set", await ev(() => { const r = T.door(game.rooms.hamalayi.observatory.door); T.talk('keeper'); const t = game.rooms.obsv.telescope; T.useAt(t.x, t.z); T.useAt(t.x, t.z); return [r, game.flags.c10_keeper, game.flags.c10_domeRelay, game.flags.c10_dome, T.obj()]; }), (v) => v[1] === true && v[2] === true && v[3] === true && v[4].length > 0);
await shot('C10-08-dome.png');
is('the glider and the spaceship back to Zeelich', await ev(() => { T.out(); const L = game.story.cur.landing('hamalayi'); T.tp(L.x, L.z); return [T.fly(0), T.ship('citadel_port'), T.obj()]; }), (v) => v[1][0] === 'zeelich');
const fin = await ev(() => { const c = game.rooms.zeelich.platform.console; T.useAt(c.x, c.z); for (let i = 0; i < 30; i++) { game.step(0.2); T.talkAll(); } return [game.flags.c10_done, game.flags.chapterKey, game.room?.id]; });
log('console', fin);
{ const miss = await ev(() => T.miss); if (miss.length) log('talk prompt not theirs from any side:', miss); }
// the verdict (R7-VERDICTS: was CHAPTER 10 DONE / ASSISTED (exit 2, "not a pass") / NOT DONE, now one policy)
check('at the dial facing Zoé, E is for Zoé', facedZoe === 'zoe', facedZoe);
check('chapter 10 done at the platform console: the next chapter (shell) set', fin[0] === true && fin[1] === 'shell', fin);
check('every ball target hit by a real throw (an ISO assist is not a pass)', !assists.length, assists);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
