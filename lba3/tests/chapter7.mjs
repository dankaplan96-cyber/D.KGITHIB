// Chapter 7 playthrough (the Hamalayi): jump to the end of chapter 6 → the monastery → the observatory (Sefa,
// four mirrors, the crystal, Sendell) → the telescope melts the vent's ice cap → the heavy drone → the vent →
// Arthur's call → Hesk at the monastery → the next chapter.
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
      f() { return { ...G.flags }; },
      obj() { return document.querySelector('#pause-objective')?.textContent || ''; },
    };
  });
};

await boot('new');
is('chapter 7 (observatory) starts on the Hamalayi, in play, an objective set', await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 5, chapterKey: 'pass', c6_started: true, c6_bridge: true, c6_heat: true, c6_thawed: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id, G.state, T.obj()]; }), (v) => v[0] === 'observatory' && v[1] === 'hamalayi' && v[2] === 'play' && v[3].length > 0);
is('into the observatory', await ev(() => { const G = game, d = G.rooms.hamalayi.observatory.door; T.tp(d.x, d.z + 1.6, 0, 31); G.step(0.3); T.tp(d.x, d.z, 0, 31); G.step(1.6); T.talkAll(); return [G.room?.id, T.obj()]; }), (v) => v[0] === 'obsv');
is('the keeper: carry the light', await ev(() => { T.talk('keeper'); return [game.flags.c7_keeper, T.obj()]; }), (v) => v[0] === true && v[1].length > 0);
await shot('C7-00-obs.png');
// CHAPTER-BALANCE: one sun is not enough. The three mirrors carry the first beam: the crystal glows faintly, nobody speaks
is('the three mirrors carry the first sun\'s beam: the crystal glows faintly, not lit, no Sendell; the second slit iced over', await ev(() => { const G = game, O = G.rooms.obsv; for (const i of [0, 1, 2]) { const m = O.mirrors[i]; T.useAt(m.x, m.z); G.step(0.5); } T.talkAll(); const r = O.trace(); return { n: r.n, lit: r.lit, flag: !!G.flags.c7_lit, sendell: !!G.flags.c7_sendell, ice: O.ice.broken, iceTarget: O.ballTargets.some((t) => t.ice && !t.done) }; }), (v) => v.n === 1 && !v.lit && !v.flag && !v.sendell && !v.ice && v.iceTarget);
is('Sefa, asked again, points at the frozen window', await ev(() => { const G = game, said = []; const s0 = G.say.bind(G); G.say = (n, l, ...r) => { said.push([].concat(l).join(' ')); return s0(n, l, ...r); }; T.talk('keeper'); G.say = s0; return said; }), (v) => v.some((l) => /both suns|frozen/i.test(l)));
is('the ball breaks the ice over the second sun\'s slit (thrown)', await ev(() => { const G = game, O = G.rooms.obsv, tg = O.ballTargets.find((t) => t.ice), h = G.hero; let how = 'FAILED';
  // (from the floor in front of the slit, inside the hall: T.hit's ring of spots would stand him behind the back wall)
  for (let i = 0; i < 5 && !O.ice.broken; i++) { const a = -0.35 - i * 0.15; T.tp(tg.x + Math.sin(a) * 3.0, tg.z + Math.cos(a) * 3.0); h.angle = Math.atan2(tg.x - h.pos.x, tg.z - h.pos.z); G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(1.4); T.talkAll(); }
  if (O.ice.broken) how = 'thrown';
  return { how, ice: G.flags.c7_ice, broken: O.ice.broken, n: O.trace().n }; }), (v) => v.how === 'thrown' && v.ice === true && v.broken && v.n === 1);
is('the fourth mirror carries the second beam: the crystal lit; Sendell', await ev(() => { const G = game, O = G.rooms.obsv, m = O.mirrors[3]; T.useAt(m.x, m.z); G.step(0.5); T.talkAll(); return [O.trace().lit, G.flags.c7_lit, G.flags.c7_sendell, T.obj()]; }), (v) => v[0] === true && v[1] === true && v[2] === true && v[3].length > 0);
await shot('C7-01-lit.png');
is('the telescope turned, an objective set', await ev(() => { const O = game.rooms.obsv; T.useAt(O.telescope.x, O.telescope.z); T.talkAll(); return [game.flags.c7_scope, T.obj()]; }), (v) => v[0] === true && v[1].length > 0);
is('back out on the Hamalayi', await ev(() => T.exit('obs-out')), (v) => v === 'hamalayi');
is('the heavy drone destroyed by the ball', await ev(() => { const G = game, h = G.hero, V = G.rooms.hamalayi.vent; T.tp(V.x + 8, V.z + 8); G.step(1); T.talkAll(); const d = G.story.cur.heavy(); for (let i = 0; i < 40 && d.alive; i++) { h.pos.set(d.pos.x - 3.5, G.physics.groundAt(d.pos.x - 3.5, d.pos.z), d.pos.z); h.angle = h.angleTo(d); h.hp = h.maxHp; G.ball.state = 'idle'; T.tap('KeyF'); G.step(1.0); if (G.state === 'dialog') T.talkAll(); } G.step(0.5); T.talkAll(); return [d.alive, G.flags.c7_droneDown, T.obj()]; }), (v) => v[0] === false && v[1] === true && v[2].length > 0);
await shot('C7-02-vent.png');
// CHAPTER-BALANCE: the seal is carved like the dig's; it turns only with its three warm (steaming) discs woken by the ball
is('the seal will not turn yet: the discs named, the objective counts them', await ev(() => { const V = game.rooms.hamalayi.vent; T.useAt(V.x + 2.8, V.z); game.step(1); T.talkAll(); return [game.flags.c7_vent, game.flags.c7_sealSeen, T.obj()]; }), (v) => !v[0] && v[1] === true && /disc/i.test(v[2]));
is('a cold disc only rings; the three warm discs woken by thrown balls', await ev(() => { const G = game, M = G.rooms.hamalayi, V = M.vent, h = G.hero;
  const throwAt = (D) => { const a = Math.atan2(D.x - V.x, D.z - V.z); T.tp(D.x + Math.sin(a) * 3.2, D.z + Math.cos(a) * 3.2); h.angle = Math.atan2(D.x - h.pos.x, D.z - h.pos.z); h.hp = h.maxHp; G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(1.6); T.talkAll(); };
  const cold = M.ventDiscs.find((d) => !d.warm); throwAt(cold);
  const res = { cold: cold.lit, warm: [] };
  for (const D of M.ventDiscs.filter((d) => d.warm)) { for (let k = 0; k < 3 && !D.lit; k++) throwAt(D); res.warm.push(D.lit); }
  res.flags = [0, 2, 3].map((i) => !!G.flags['c7_disc' + i]); return res; }), (v) => v.cold === false && v.warm.length === 3 && v.warm.every(Boolean) && v.flags.every(Boolean));
is('the glacier vent opened, an objective set', await ev(() => { const V = game.rooms.hamalayi.vent; T.useAt(V.x + 2.8, V.z); game.step(2); T.talkAll(); return [game.flags.c7_vent, T.obj()]; }), (v) => v[0] === true && v[1].length > 0);
is('chapter 7 ends: the next chapter (evacuation)', await ev(() => { const G = game, g = G.rooms.hamalayi.monastery.gate; T.tp(g.x, g.z + 1); G.step(0.5); T.talkAll(); G.step(1.5); T.talkAll(); return [G.flags.c7_done, G.flags.chapterKey, G.room?.id]; }), (v) => v[0] === true && v[1] === 'evacuation');
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
