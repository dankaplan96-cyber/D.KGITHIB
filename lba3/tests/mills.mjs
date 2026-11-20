// MILLS (REVIEW-TASKS-19-11 task 5): the Zeelich mills' brakes and what they cost, both ways through to chapter 9.
// Staged: the story's own flags jump to chapter 3 with the key built (as tests/chapter2.mjs does); the brakes are hit
// by real ball throws (KeyF from a few metres, the aim the game gives), Oku and the console by the talk key.
//   A. released early: the first brake stops the plaza fountain (Oku's two lines: the cost, when to let go); three
//      brakes, the shield; the hero says the key holds it; save → Continue with one mill let go (the choice half made);
//      the rest let go → the fountain runs, Oku's "I'll remember both"; the journal both lines; on to chapter 9: the
//      mills turn, Oku stamps without his errand (c9_oku_r1/r2), the journal says he remembered; save → Continue.
//   B. left braked (an older save: c2_mill_* and no c2_free_*): chapter 9 as before, "a week", the fountain still,
//      his errand frees the three, the stamp, the journal's other line.
//   C. one mill let go in chapter 3: chapter 9's errand asks only for the other two (never the same brake twice).
// Run: GAME_URL=http://localhost:<port>/ node tests/mills.mjs
import { launch, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
const boot = async (mode) => {
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  await page.evaluate(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await ev(() => {
    const G = window.game; G.testFreeze = true;
    const said = (window.SAID = []);
    const say0 = G.say.bind(G);
    G.say = (name, lines, ...rest) => { said.push(String(name) + ': ' + [].concat(lines).join(' ')); return say0(name, lines, ...rest); };
    window.T = {
      tap(c) { G.input.taps.add(c); G.step(1 / 60); },
      talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0) { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); },
      npc(id) { return G.npcs.find((n) => n.def.id === id); },
      talk(id) { const n = T.npc(id); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05); T.talkAll(); },
      // a real throw at a brake from a few metres, round it until the flag says it took
      throwAt(b, doneFn) { for (let k = 0; k < 12 && !doneFn(); k++) { const a = k * 0.55; const x = b.x + Math.sin(a) * 5, z = b.z + Math.cos(a) * 5; T.tp(x, z); G.hero.angle = Math.atan2(b.x - x, b.z - z); G.ball.state = 'idle'; G.hero.hp = G.hero.maxHp ?? 10; T.tap('KeyF'); G.step(2.2); T.talkAll(); } return doneFn(); },
      door(d) { T.tp(d.x, d.z + 1.5); G.step(1.2); T.tp(d.x, d.z); G.step(1.2); T.talkAll(); return G.room?.id ?? 'out'; },
      out() { const e = G.room.exits[0]; T.tp(e.x, e.z); G.step(1.6); T.talkAll(); return G.room?.id ?? 'out'; },
      obj() { return document.querySelector('#pause-objective')?.textContent || ''; },
      journal() { return G.story.journal().flatMap((s) => s.lines || []).map((l) => l.key); },
      fountain() { G.step(3.0); return G.rooms.zeelich.fountain.running; },
      spin() { return G.rooms.zeelich.mills.map((m) => m.spinning); },
      said(from) { return window.SAID.slice(from); },
    };
  });
};
// the journal's keys, as the journal page lists them (story.journal: a section per chapter)
const journalKeys = () => ev(() => T.journal());
// to chapter 9 from wherever the flags are: the end of chapter 8 (as tests/chapter9.mjs)
const toCouncil = (extra) => ev((extra) => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 7, chapterKey: 'evacuation', c1_water: true, c1_done: true, c2_done: true, c8_started: true, c8_vesk: true, c8_done: true }, extra);
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id]; }, extra);
// the fountain from the street beside it (the play camera behind him), for review: captures/mills/
const shotAt = async (name) => { await ev(() => { const F = game.rooms.zeelich.fountain; T.tp(F.x + 4.5, F.z + 2.2, -Math.PI / 2 - 0.3); game.step(1.0); game.renderer.render(); }); await page.screenshot({ path: 'captures/mills/' + name, timeout: 180000 }); };
const formFromBaldino = () => ev(() => { const Z = game.rooms.zeelich; const r = T.door(Z.workshopDoor); T.talk('baldino'); T.out(); return [r, game.flags.c9_form]; });

// ================================================================ A. released early
await boot('new');
is('A: chapter 3 with the key built and Zoé done; the fountain runs, the mills turn', await ev(() => { const G = game; T.talkAll();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
  Object.assign(G.flags, { c2_plan: true, c2_okuOK: true, c2_planBack: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_zoeStart: true, c2_broadcast: true });
  G.story.applyFlags?.(); G.step(0.5); T.talkAll();
  return [G.flags.chapterKey, G.room?.id, T.fountain(), T.spin().join(',')]; }), (v) => v[0] === 'zeelich' && v[1] === 'zeelich' && v[2] === true && v[3] === 'true,true,true');
await shotAt('M-01-fountain-running.png');
const n0 = await ev(() => window.SAID.length);
is('A: the first brake (a thrown ball) stops the fountain; Oku says what it costs and when to let go', await ev(() => { const G = game, m = G.rooms.zeelich.mills[1];
  const ok = T.throwAt(m.brake, () => !!G.flags['c2_mill_' + m.id]); return [ok, T.fountain(), T.spin().join(','), T.journal().includes('c2_j_dry')]; }), (v) => v[0] && v[1] === false && v[2] === 'true,false,true' && v[3]);
await shotAt('M-02-fountain-still.png');
is('A: Oku\'s two lines were said after the brake', await ev((n0) => T.said(n0), n0), (v) => v.some((s) => /There goes the fountain/.test(s)) && v.some((s) => /knock the brakes loose again/.test(s)));
is('A: the other two braked; the console opens the shield; the hero says the key holds it; an optional sub', await ev(() => { const G = game, Z = G.rooms.zeelich, f = G.flags;
  for (const m of Z.mills) T.throwAt(m.brake, () => !!f['c2_mill_' + m.id]);
  const n1 = window.SAID.length;
  const c = Z.platform.console; T.tp(c.x - 1.0, c.z); G.hero.angle = Math.atan2(1, 0); T.tap('KeyE'); G.step(1.8); T.talkAll();
  return [f.c2_shield, T.spin().join(','), T.said(n1).some((s) => /holds the shield open/.test(s)), T.obj()]; }), (v) => v[0] === true && v[1] === 'false,false,false' && v[2] && /Optional: let the mills turn again \(0\/3\)/.test(v[3]));
is('A: Oku, now: the shield is down, so let them go', await ev(() => { const n = window.SAID.length; T.talk('oku'); return T.said(n); }), (v) => v.some((s) => /still standing/.test(s)));
is('A: one mill let go by a throw (the fountain still waits for all three)', await ev(() => { const G = game, m = G.rooms.zeelich.mills[0];
  const ok = T.throwAt(m.brake, () => !!G.flags['c2_free_' + m.id]); return [ok, T.spin().join(','), T.fountain(), T.obj()]; }), (v) => v[0] && v[1] === 'true,false,false' && v[2] === false && /\(1\/3\)/.test(v[3]));
// save mid-choice, Continue
await ev(() => game.save(false));
await boot('continue');
await ev(() => { game.step(0.5); T.talkAll(); });
is('A: save → Continue mid-choice: one let go, two braked, the fountain still; the shield stays open', await ev(() => { const G = game, f = G.flags; return [G.room?.id, !!f.c2_free_north, !!f.c2_free_east, T.spin().join(','), T.fountain(), G.rooms.zeelich.platform.shield.on]; }),
  (v) => v[0] === 'zeelich' && v[1] && !v[2] && v[3] === 'true,false,false' && v[4] === false && v[5] === false);
is('A: the other two let go: the fountain runs, Oku will remember; the journal says so', await ev(() => { const G = game, Z = G.rooms.zeelich, f = G.flags; const n = window.SAID.length;
  for (const m of Z.mills) T.throwAt(m.brake, () => !!f['c2_free_' + m.id]);
  return [T.spin().join(','), T.fountain(), T.said(n).some((s) => /remember both/.test(s)), T.journal().filter((k) => /c2_j_(dry|free)/.test(k)), T.obj()]; }),
  (v) => v[0] === 'true,true,true' && v[1] === true && v[2] && v[3].join() === 'c2_j_dry,c2_j_free' && /\(3\/3\)/.test(v[4]));
await shotAt('M-03-fountain-back.png');
is('A: a released brake is not a target again (no repair twice)', await ev(() => game.story.ballTargets().length), (v) => v === 0);
is('A: chapter 9: the mills turn, the fountain runs', await toCouncil({}).then(async (r) => [...r, ...await ev(() => [T.spin().join(','), T.fountain()])]), (v) => v[0] === 'council' && v[2] === 'true,true,true' && v[3] === true);
is('A: chapter 9: Baldino\'s petition', await formFromBaldino(), (v) => v[1] === true);
is('A: Oku remembers: he stamps without his errand; his lines say one afternoon, not a week', await ev(() => { const G = game, f = G.flags, n = window.SAID.length; T.talk('oku'); const s = T.said(n);
  return [f.c9_oku, f.c9_okuAsk, G.story.ballTargets().length, s.some((x) => /one afternoon, not a week/.test(x)), s.some((x) => /no water for a week/.test(x)), T.obj()]; }),
  (v) => v[0] === true && v[1] === true && v[2] === 0 && v[3] && !v[4] && !/Release the brakes/.test(v[5]));
is('A: the journal has the remembered stamp', await journalKeys(), (v) => v.includes('c9_j_oku_r') && !v.includes('c9_j_oku') && v.includes('c2_j_free'));
await ev(() => game.save(false));
await boot('continue');
await ev(() => { game.step(0.5); T.talkAll(); });
is('A: save → Continue in chapter 9: the stamp kept, the mills turning', await ev(() => [game.flags.chapterKey, game.flags.c9_oku, T.spin().join(','), T.fountain()]), (v) => v[0] === 'council' && v[1] === true && v[2] === 'true,true,true' && v[3] === true);

// ================================================================ B. left braked (an older save's flags)
await boot('new');
is('B: chapter 9 from an older save (braked, no c2_free_): the mills still, the fountain still', await toCouncil({ c2_plan: true, c2_key: true, c2_shield: true, c2_veskDown: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true }).then(async (r) => [...r, ...await ev(() => [T.spin().join(','), T.fountain()])]),
  (v) => v[0] === 'council' && v[2] === 'false,false,false' && v[3] === false);
await formFromBaldino();
is('B: Oku keeps his demand: a week without water, the errand', await ev(() => { const n = window.SAID.length; T.talk('oku'); return [game.flags.c9_okuAsk, game.flags.c9_oku, T.said(n).some((s) => /no water for a week/.test(s)), game.story.ballTargets().length, T.obj()]; }),
  (v) => v[0] === true && !v[1] && v[2] && v[3] === 3 && /Release the brakes on the mills \(0\/3\)/.test(v[4]));
is('B: the three freed by throws, the fountain runs, the stamp; the journal\'s line for this way', await ev(() => { const G = game, f = G.flags;
  for (const m of G.rooms.zeelich.mills) T.throwAt(m.brake, () => !!f['c9_free_' + m.id]);
  T.talk('oku'); return [G.story.cur.millsFree(), T.fountain(), f.c9_oku]; }), (v) => v[0] === 3 && v[1] === true && v[2] === true);
is('B: the journal', await journalKeys(), (v) => v.includes('c9_j_oku') && !v.includes('c9_j_oku_r') && !v.includes('c2_j_free'));

// ================================================================ C. one let go in chapter 3
await boot('new');
await toCouncil({ c2_plan: true, c2_key: true, c2_shield: true, c2_veskDown: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true, c2_free_north: true });
await formFromBaldino();
is('C: one mill let go in chapter 3: it turns; Oku\'s errand asks only for the other two', await ev(() => { T.talk('oku'); return [T.spin().join(','), game.flags.c9_okuAsk, game.story.ballTargets().length, game.story.cur.millsFree(), T.obj()]; }),
  (v) => v[0] === 'true,false,false' && v[1] === true && v[2] === 2 && v[3] === 1 && /\(1\/3\)/.test(v[4]));

await browser.close();
done();
