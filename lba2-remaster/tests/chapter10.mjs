// Chapter 10 playthrough (Baldino's network): jump to the end of chapter 9 → Baldino's workshop → Oku's mill
// (ball on the brake, climb, the relay) → Hesk's glider to Citadel → Mira's valve room (three valves) → the
// lighthouse (Zoé, Arthur, the dials) → Desert Island (Ilka, the relay on the bore, three drones) → the
// Hamalayi (Pim, Sefa's dome: the relay, the telescope) → back to Zeelich → the platform console → chapter 11.
// Verdict: CHAPTER 10 DONE only when every ball target (the mill's brake, the three drones) fell to throws; if any
// had to be beaten through its own rule (an ISO assist, logged), the run ends CHAPTER 10 ASSISTED with exit code 2.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
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
      obj() { return document.querySelector('#objective')?.textContent || ''; },
    };
  });
};

await boot('new');
await ev(() => { T.useOn = (x, z) => { const G = game; T.tp(x, z); G.step(0.2); T.tap('KeyE'); G.step(1.4); T.talkAll(); };
  T.fly = (i) => { const G = game, n = T.npc('hesk'), h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05);
    for (let k = 0; k < 80 && G.state === 'dialog'; k++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.2); if (G.state !== 'shop') return ['no menu: ' + G.state, n.present, +n.pos.x.toFixed(1), +n.pos.z.toFixed(1), +h.pos.x.toFixed(1), +h.pos.z.toFixed(1), G.npcs.filter((m) => m.present && m.distTo(h) < 4).map((m) => m.def.id), G.story.cur.region(), G.room?.id]; document.querySelector(`#shop .item[data-i="${i}"]`).click(); for (let k = 0; k < 30; k++) { G.step(0.1); T.talkAll(); } return G.room?.id ?? 'out'; }; });

log('start', await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 8, chapterKey: 'council', c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
    c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_zoeDone: true, c9_started: true, c9_vote: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id ?? 'out', G.flags.c10_started, T.obj()]; }));
await shot('C10-00-workshop.png');
log('oku', await ev(() => { T.out(); T.talk('oku'); return [game.room?.id, game.flags.c10_okuAsk]; }));
{ const b = await ev(() => { const G = game, f = G.flags, m = G.rooms.zeelich.mills[0]; return [T.hit({ ...m.brake, get done() { return !!f.c10_millBraked; } }), m.spinning]; });
  log('brake', b); if (b[0] !== 'thrown') { assists.push('mill brake: ' + b[0]); log('ISO  the mill brake was not hit by a throw: ' + b[0]); } }
log('mill relay', await ev(() => { const mt = game.rooms.zeelich.millTop; T.useAt(mt.x, mt.z, mt.y); return [game.flags.c10_mill, game.rooms.zeelich.mills[0].spinning, T.obj()]; }));
await shot('C10-01-mill.png');
log('to citadel', await ev(() => { const L = game.story.cur.landing('zeelich'); T.tp(L.x, L.z); return T.fly(1); }));
await shot('C10-02-citadel-landing.png');
log('mira', await ev(() => { const o = game.world.houses.find((h) => h.id === 'water').door; const r = T.door(o); T.talk('mira'); game.step(1.5); T.talkAll(); return [r, game.flags.c10_miraAsk, game.room?.id]; }));
log('valves', await ev(() => { const V = game.rooms.valves; for (const i of [0, 1, 2]) { const v = V.valves[i]; T.useAt(v.x, v.z); } return [game.story.cur.gaugeLevels(), game.flags.c10_valves]; }));
await shot('C10-03-valves.png');
log('out', await ev(() => { const a = T.exit('valves-out'); const b = T.out(); return [a, b]; }));
// REV-TY-5 T1 (for players): standing at the middle dial (a plain search until Zoé has asked) and facing Zoé, E is hers
const facedZoe = await ev(() => { const G = game, h = G.hero; T.door({ x: -107.5, z: 94.2 }); const z = T.npc('zoe'), s = G.rooms.lighttop.searches.find((x) => x.id === 'dial2');
  T.tp(s.x, s.z); h.angle = Math.atan2(z.pos.x - h.pos.x, z.pos.z - h.pos.z); const it = G.findInteractable();
  return it?.npc?.def.id || it?.spot?.id || it?.kind || null; });
log('at the dial facing Zoé, E is for', facedZoe);
log('lighthouse', await ev(() => { const r = game.room?.id ?? 'out'; const z = T.npc('zoe'); const before = [z.present, +z.pos.x.toFixed(1), +z.pos.z.toFixed(1), game.state]; T.talk('zoe'); return [r, before, game.state, game.flags.c10_zoeAsk, +game.hero.pos.x.toFixed(1), +game.hero.pos.z.toFixed(1)]; }));
log('dials', await ev(() => { const L = game.rooms.lighttop; for (const i of [1, 2, 3]) { const s = L.searches.find((x) => x.id === 'dial' + i); for (let k = 0; k < 2; k++) T.useOn(s.x, s.z); } return [game.flags.c10_dials, game.flags.c10_light, T.obj()]; }));
await shot('C10-04-lighthouse.png');
log('to desert', await ev(() => { T.exit('outdoor-lighthouse'); const L = game.story.cur.landing('citadel'); T.tp(L.x, L.z); return T.fly(2); }));
await shot('C10-05-desert-landing.png');
log('ilka', await ev(() => { T.talk('ilka'); const b = game.rooms.desert.bore; T.useAt(b.x, b.z); return [game.flags.c10_ilka, game.flags.c10_boreRelay, game.story.cur.boreDrones().filter((e) => e.present).length]; }));
// the three drones by throws (the drones' AI uses unseeded Math.random, so a drone can dodge many throws in a row):
// each throw from a fresh side and distance, aimed again a moment before it leaves the hand; up to 120 throws per
// drone. Only a drone still flying after that is beaten through its own damage rule, and that is logged as ISO.
const drones = await ev((MAXT) => { const G = game, h = G.hero, out = [], iso = [];
  for (const d of G.story.cur.boreDrones()) {
    let n = 0;
    for (; n < MAXT && d.alive; n++) {
      const a = Math.PI / 2 + n * 2.4, r = 2.8 + (n % 3) * 0.5, x = d.pos.x - Math.sin(a) * r, z = d.pos.z - Math.cos(a) * r;
      h.pos.set(x, G.physics.groundAt(x, z), z); h.onGround = true; h.vy = 0; h.hp = h.maxHp; G.ball.state = 'idle';
      h.angle = h.angleTo(d); G.step(0.05); h.angle = h.angleTo(d);
      T.tap('KeyF'); G.step(1.0); if (G.state === 'dialog') T.talkAll();
    }
    if (d.alive) { d.damage(99, null); G.step(0.5); out.push(d.def.id + ': ISO assist after ' + n + ' throws'); iso.push(d.def.id + ' killed by its damage rule after ' + n + ' throws'); } else out.push(d.def.id + ': thrown (' + n + ' throws)');
  }
  for (let i = 0; i < 20; i++) { G.step(0.2); T.talkAll(); }
  return [out, G.story.cur.boreDrones().map((d) => d.alive), G.flags.c10_bore, T.obj(), iso]; }, MAX_THROWS);
log('drones', drones.slice(0, 4));
for (const a of drones[4]) { assists.push('drone ' + a); log('ISO  drone ' + a); }
await shot('C10-06-bore.png');
log('to hamalayi', await ev(() => { const L = game.story.cur.landing('desert'); T.tp(L.x, L.z); return T.fly(3); }));
await shot('C10-07-monastery.png');
log('pim', await ev(() => { T.talk('yorna'); return [game.flags.c10_pim]; }));
log('dome', await ev(() => { const r = T.door(game.rooms.hamalayi.observatory.door); T.talk('keeper'); const t = game.rooms.obsv.telescope; T.useAt(t.x, t.z); T.useAt(t.x, t.z); return [r, game.flags.c10_keeper, game.flags.c10_domeRelay, game.flags.c10_dome, T.obj()]; }));
await shot('C10-08-dome.png');
log('to zeelich', await ev(() => { T.out(); const L = game.story.cur.landing('hamalayi'); T.tp(L.x, L.z); return [T.fly(0), T.obj()]; }));
const fin = await ev(() => { const c = game.rooms.zeelich.platform.console; T.useAt(c.x, c.z); for (let i = 0; i < 30; i++) { game.step(0.2); T.talkAll(); } return [game.flags.c10_done, game.flags.chapterKey, game.room?.id]; });
log('console', fin);
{ const miss = await ev(() => T.miss); if (miss.length) log('talk prompt not theirs from any side:', miss); }
console.log(errs.length ? errs.join('\n') : 'no errors');
const ok = fin[0] && facedZoe === 'zoe' && !errs.length;
if (ok && assists.length) console.log('assisted: ' + assists.join('; '));
console.log(!ok ? 'CHAPTER 10 NOT DONE' : assists.length ? 'CHAPTER 10 ASSISTED (not a pass: ' + assists.length + ' ball target(s) not hit by throws)' : 'CHAPTER 10 DONE');
process.exitCode = !ok ? 1 : assists.length ? 2 : 0;
await browser.close();
