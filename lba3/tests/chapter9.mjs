// Chapter 9 playthrough (Zeelich, the council): jump to the end of chapter 8 → the dock → Baldino's
// workshop (the petition) → Nara's stamp → Oku's errand (knock the three mill brakes loose with the ball) →
// Oku's stamp → the council house: the clerk → the first hearing → the archive (the coat, the wrong cabinet,
// the master plans) → the second hearing with Dallan → the vote → the next chapter.
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
      run(s) { for (let i = 0; i < s * 5; i++) { G.step(0.2); T.talkAll(); } },
      obj() { return document.querySelector('#pause-objective')?.textContent || ''; },
    };
  });
};

await boot('new');
is('chapter 9 (council) starts on Zeelich, in play, an objective set', await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 7, chapterKey: 'evacuation', c1_water: true, c1_done: true, c2_shield: true, c2_mill_north: true, c8_started: true, c8_vesk: true, c8_done: true, dt_v: 1, dt_strip: true, zt_v: 1, zt_water: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id ?? 'out', G.state, T.obj()]; }), (v) => v[0] === 'council' && v[1] === 'zeelich' && v[2] === 'play' && v[3].length > 0);
await shot('C9-00-dock.png');
is('the street folk (Mosquibees, moles, triangle heads) stand on the street and talk', await ev(() => ['zbee1', 'zbee2', 'zmole1', 'zmole2', 'ztri1', 'ztri2'].map((id) => { const n = T.npc(id); if (!n) return id + ' missing'; const g = game.physics.groundAt(n.pos.x, n.pos.z, n.pos.y + 1); T.talk(id); return id + (Math.abs(g - n.pos.y) < 0.3 ? ' on the street' : ' OFF THE GROUND') + (game.state === 'play' ? ', talked' : ' STUCK ' + game.state); })), (v) => v.length === 6 && v.every((x) => x.endsWith('on the street, talked')));
is('Baldino: the petition, back out, an objective set', await ev(() => { const Z = game.rooms.zeelich; const r = T.door(Z.workshopDoor); T.talk('baldino'); const back = T.out(); return [r, game.flags.c9_form, back, T.obj()]; }), (v) => v[0] === 'workshop' && v[1] === true && v[2] === 'zeelich' && v[3].length > 0);
is("Nara's stamp", await ev(() => { T.talk('nara'); return [game.flags.c9_nara]; }), (v) => v[0] === true);
is('Oku asks for the mills to be freed (all braked)', await ev(() => { T.talk('oku'); return [game.flags.c9_okuAsk, game.rooms.zeelich.mills.map((m) => m.spinning)]; }), (v) => v[0] === true && v[1].every((m) => m === false));
is('the three mills freed by the ball', await ev(() => { const G = game, f = G.flags; return G.rooms.zeelich.mills.map((m) => T.hit({ ...m.brake, get done() { return !!f['c9_free_' + m.id]; } })).concat([G.story.cur.millsFree()]); }), (v) => v.slice(0, 3).every((x) => x !== 'FAILED') && v[3] === 3);
await shot('C9-01-mills.png');
is("Oku's stamp, an objective set", await ev(() => { T.talk('oku'); return [game.flags.c9_oku, T.obj()]; }), (v) => v[0] === true && v[1].length > 0);
is('into the council house', await ev(() => { const r = T.door(game.rooms.zeelich.councilDoor); return [r, T.obj()]; }), (v) => v[0] === 'upper');
await shot('C9-02-antechamber.png');
is('the archive refused before the hearing', await ev(() => { const r = T.exit('up-archive'); return [r]; }), (v) => v[0] === 'upper');
is('the clerk takes the petition', await ev(() => { T.talk('clerk'); return [game.flags.c9_clerk, T.obj()]; }), (v) => v[0] === true && v[1].length > 0);
is('the hearing, an objective set', await ev(() => { const r = T.exit('up-council'); game.step(0.5); T.talkAll(); return [r, game.flags.c9_heard, T.obj()]; }), (v) => v[0] === 'council' && v[1] === true && v[2].length > 0);
await shot('C9-03-council.png');
// CAMPAIGN-7 (story/cnline.js; this chapter's thread is on in a game that begins it): the archive's door shut by Vesk's
// standing order; Kell takes him up to the service door; the back gallery
is("after the hearing the archive's door is shut by Vesk's standing order, read on it; the objective names Kell", await ev(() => { T.exit('council-out'); const r = T.exit('up-archive'); T.talkAll(); return [r, game.flags.cn_v, game.flags.cn_closed, game.rooms.upper.order.shown, T.obj()]; }), (v) => v[0] === 'upper' && v[1] === 1 && v[2] === true && v[3] && /Kell/.test(v[4]));
await shot('C9-03b-order.png');
is('Kell agrees and brings the deck down; on it with him, up to the terrace; he opens the service door', await ev(() => {
  const G = game, f = G.flags, L = G.rooms.zeelich.lift; T.exit('up-down'); T.talk('zl_kell'); T.run(4); const low = +(L.deckY - L.low).toFixed(2);
  T.useAt(L.deck.x, L.deck.z); T.run(16); return [!!f.cn_kellAsk, low, f.cn_kell, +(G.hero.pos.y - L.top).toFixed(2), T.obj()]; }), (v) => v[0] && v[1] === 0 && v[2] === true && Math.abs(v[3]) < 0.2 && /service door/i.test(v[4]));
await shot('C9-03c-service.png');
is('through the service door: the archive\'s back gallery, up over the archivist\'s round, its watcher on', await ev(() => { const L = game.rooms.zeelich.lift; T.useAt(L.service.x, L.service.z, L.top); T.run(4); return [game.room?.id, +game.hero.pos.y.toFixed(1), !!game.story.cur.watcher?.active]; }), (v) => v[0] === 'archive' && v[1] > 2 && v[2] === true);
await shot('C9-04-archive.png');
is("the worker's coat: disguised", await ev(() => { const L = game.rooms.archive.locker; T.useAt(L.x, L.z); return [game.flags.c9_coat, game.hero.body, game.hero.disguised]; }), (v) => v[0] === true && v[1] === 'worker' && v[2] === true);
is('the wrong cabinet (FERRIES) has no plans', await ev(() => { const c = game.rooms.archive.cabinets.find((x) => x.label === 'FERRIES'); T.useAt(c.x, c.z); return [game.flags.c9_plans]; }), (v) => !v[0]);
// CHAPTER-BALANCE: the BORE cabinet is locked until the archivist's key ring is taken from his desk
is('the BORE cabinet without the key: locked, no plans; the objective names the key', await ev(() => { const c = game.rooms.archive.cabinets.find((x) => x.label === 'BORE'); T.useAt(c.x, c.z); return [game.flags.c9_plans, game.flags.c9_locked, T.obj()]; }), (v) => !v[0] && v[1] === true && /key/i.test(v[2]));
is("the archivist's key ring taken from his desk", await ev(() => { const K = game.rooms.archive.keys; T.useAt(K.x, K.z); return [game.flags.c9_key, K.taken]; }), (v) => v[0] === true && v[1] === true);
is('the BORE cabinet: its drawer: the log of test 14 and the order that cut it; the objective the carbon', await ev(() => { const c = game.rooms.archive.cabinets.find((x) => x.label === 'BORE'); T.useAt(c.x, c.z); return [game.flags.cn_drawer, game.rooms.archive.drawer.open, game.flags.c9_plans, T.obj()]; }), (v) => v[0] === true && v[1] && !v[2] && /carbon/i.test(v[3]));
is('his carbon laid on the log: the plans and the log in hand, the carbon handed on', await ev(() => { const D = game.rooms.archive.drawer; T.useAt(D.x, D.z); T.run(4); return [game.flags.cn_log, game.flags.c9_plans, game.story.items().some((i) => i.id === 'tstrip'), T.obj()]; }), (v) => v[0] === true && v[1] === true && !v[2] && v[3].length > 0);
log('spot test', await ev(() => { const G = game; return [G.story.cur.watcher?.active]; }));
is('the vote orders the bore stopped; the chapter goes on (back to Twinsen, still chapter 9), the objective the platform\'s console', await ev(() => { const r1 = T.exit('archive-out'); const b = game.hero.body; const r2 = T.exit('up-council'); game.step(0.5); T.talkAll(); for (let i = 0; i < 20; i++) { game.step(0.2); T.talkAll(); } return [r1, b, r2, game.flags.c9_vote, game.flags.chapterKey, T.obj()]; }), (v) => v[1] === 'twinsen' && v[2] === 'council' && v[3] === true && v[4] === 'council' && /console/i.test(v[5]));
is('the stop thrown at the console: the BORE needle falls, the GROUND needle kicks on; Mill Lane dry (the cart half way, no water); the objective the bench', await ev(() => {
  const G = game, f = G.flags; T.exit('council-out'); T.exit('up-down'); const S = G.rooms.zeelich.platform.stop, L = G.rooms.zeelich.lift; T.useAt(S.x, S.z); T.run(20);
  return [f.cn_stop, S.thrown, S.loose, +(L.deckY - L.y0).toFixed(2), !!L.state.water, T.obj()]; }), (v) => v[0] === true && v[1] && v[2] && v[3] > 1.5 && v[3] < 2.5 && !v[4] && /bench/i.test(v[5]));
await shot('C9-05-console.png');
is('the bench: the isolator on one relay, then the other; one at a time; the objective Kell\'s feed', await ev(() => {
  const G = game, f = G.flags; const r = T.door(G.rooms.zeelich.workshopDoor); T.run(4); const T2 = G.rooms.workshop.life.terminals;
  T.useAt(T2.A.x, T2.A.z); T.run(4); const a = [!!f.cn_isoA, G.rooms.workshop.life.state.iso]; T.useAt(T2.B.x, T2.B.z); T.run(6);
  return [r, !!f.cn_isoGot, a, !!f.cn_isoB, !!f.cn_iso, T.obj()]; }), (v) => v[0] === 'workshop' && v[1] && v[2][0] && v[2][1] === 'A' && v[3] && v[4] && /feed/i.test(v[5]));
is('chapter 9 ends on Mill Lane: the isolator on Kell\'s feed, the lift and the water back; the next chapter (network)', await ev(() => {
  const G = game, f = G.flags; T.out(); const L = G.rooms.zeelich.lift; T.useAt(L.isoAt.x, L.isoAt.z); let water = false; for (let i = 0; i < 150 && f.chapterKey === 'council'; i++) { G.step(0.2); T.talkAll(); water ||= !!L.state.water; }
  return [!!f.cn_lane, water, f.chapterKey]; }), (v) => v[0] && v[1] && v[2] === 'network');
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
