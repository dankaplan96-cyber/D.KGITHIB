// #18 / #28: chapter 7's new vent stage, "the mountain's pulse" (?ch7stage=new; docs/lba-maturity/CH7-STAGE.md).
// Run: SERVE=1 node tests/ch7-stage.mjs   (or with a server: GAME_URL=http://localhost:<port>/ node tests/ch7-stage.mjs)
// A  with the switch on: chapter 7 reached through the story's flags and staged up to the telescope's turn (the mirrors,
//    Sendell and the fourth setting are tests/chapter7.mjs); from there by input (E, the ball's key, steps of game time):
//    no discs, five grooves and the ring; the kicks show on the live groove only; the drone by the ball; the seal looked
//    at; a kick with the arrow on a dead groove jolts it (his line once); a wrong turn jolts again (a toast); E mashed for
//    three pulses never opens it; a save made mid-stage with the discs' flags in it (c7_free1) loads with the arrow back
//    on its rest; two turns to the live groove and the next kick opens the vent once (Arthur's call, the mountain still);
//    the chapter ends at the monastery gate.
// B  without the switch: a save taken mid-stage in A (the seal looked at, c7r_jolt) loads into the discs' game and the
//    seal can still be freed and opened there.
// Automated runtime only (SwiftShader, headless Chromium). SHOTS=dir writes play-camera pictures of the stage.
import { launch, checker } from './lib/boot.mjs';
const SHOTS = process.env.SHOTS || '';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${n}`, timeout: 180000 }); };
const URL0 = process.env.GAME_URL || 'http://localhost:8123/';
const boot = async (q, mode) => {
  await page.goto(URL0 + '?nocine' + q, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  await ev(() => { game.testFreeze = true; });
  await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  if (mode === 'new') { const y = await page.$('[data-act="newyes"]'); if (y && await y.isVisible()) await y.click(); }   // (an autosave there: replace it)
  await ev(() => {
    const G = window.game; G.testFreeze = true;
    window.T = {
      tap(c) { G.input.taps.add(c); G.step(1 / 60); },
      talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0) { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); },
      obj() { return document.querySelector('#pause-objective')?.textContent || ''; },
      // listen to what is said and toasted
      listen() { const said = [], toasts = []; const s0 = G.say.bind(G), t0 = G.hud.toast.bind(G.hud); G.say = (n, l, ...r) => { said.push([].concat(l).join(' ')); return s0(n, l, ...r); }; G.hud.toast = (k, ...r) => { toasts.push(k); return t0(k, ...r); }; return { said, toasts, stop() { G.say = s0; G.hud.toast = t0; } }; },
      // step game time, answering any talk (lines are read with E)
      run(sec, until = null) { for (let t = 0; t < sec; t += 0.05) { G.step(0.05); if (G.state === 'dialog') T.talkAll(); if (until && until()) return true; } return false; },
      // stand by the seal, on the descent's side, facing it, and press E once (the player's key)
      seal() { const V = G.rooms.hamalayi.vent, R = G.rooms.hamalayi.ventRing, g = R.grooves[0], a = Math.atan2(g.x0 - V.x, g.z0 - V.z) + 0.4; T.tp(V.x + Math.sin(a) * 3.9, V.z + Math.cos(a) * 3.9, a + Math.PI); G.step(0.2); return G.findInteractable()?.kind ?? null; },
      press() { T.tap('KeyE'); G.step(0.05); },
      // one turn by E, and the wait until the ring is still again
      turn() { T.seal(); T.press(); for (let i = 0; i < 60 && (G.rooms.hamalayi.ventRing.moving || G.hero.actT > 0); i++) G.step(0.05); return G.rooms.hamalayi.ventRing.notch; },
    };
  });
};

const ONLY = process.env.ONLY || 'ABC';   // (B reads A's save: ONLY=A, ONLY=AB or ONLY=C)
// ------------------------------------------------------------------ A: the switch on
if (ONLY.includes('A')) {
await boot('&ch7stage=new', 'new');
is('A1 chapter 7 with ?ch7stage=new, staged to the telescope\'s turn: the cap melted, no discs, the ring and five grooves', await ev(() => { const G = game; T.talkAll();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 5, chapterKey: 'pass', c6_started: true, c6_bridge: true, c6_heat: true, c6_thawed: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
  Object.assign(G.flags, { rf_roof: true, c7_keeper: true, c7_ice: true, c7_lit: true, c7_sendell: true, ob_snow: true, ob_follow: true, ob_dir: true, c7_scope: true });
  G.story.applyFlags(); G.story.refreshCast(); G.updateObjective(); G.step(0.5); T.talkAll();
  const M = G.rooms.hamalayi, R = M.ventRing;
  return { key: G.flags.chapterKey, room: G.room?.id, melted: M.vent.melted, discs: M.ventDiscs.length, discTargets: M.ballTargets.filter((t) => t.disc != null).length, grooves: R?.grooves.length, live: R?.live, notch: R?.notch, line: M.line.active, obj: T.obj() }; }),
  (v) => v.key === 'observatory' && v.room === 'hamalayi' && v.melted && v.discs === 0 && v.discTargets === 0 && v.grooves === 5 && v.notch === 0 && v.line && /drone/i.test(v.obj));
await shot('new-0-approach.png');
is('A2 the mountain kicks: the snow jumps along the live groove (three times a pulse, farther out each time), never along the others', await ev(() => { const G = game, R = G.rooms.hamalayi.ventRing, V = G.rooms.hamalayi.vent;
  const near = (x, z, k) => { const g = R.grooves[k], dx = g.x1 - g.x0, dz = g.z1 - g.z0, L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - g.x0) * dx + (z - g.z0) * dz) / L2)); return Math.hypot(x - g.x0 - dx * t, z - g.z0 - dz * t) < 1.2; };
  const per = [0, 0, 0, 0, 0]; const b0 = G.particles.burst.bind(G.particles); G.particles.burst = (x, y, z, ...r) => { for (let k = 0; k < 5; k++) if (Math.hypot(x - V.x, z - V.z) > 3.6 && near(x, z, k)) per[k]++; return b0(x, y, z, ...r); };
  T.tp(V.x + 14, V.z + 10); T.run(11.5); G.particles.burst = b0; return { per, live: R.live }; }),
  (v) => v.per[v.live] >= 6 && v.per.every((n, k) => k === v.live || n === 0));
is('A3 the heavy drone destroyed by the ball', await ev(() => { const G = game, h = G.hero, V = G.rooms.hamalayi.vent; T.tp(V.x + 8, V.z + 8); G.step(1); T.talkAll(); const d = G.story.cur.heavy(); for (let i = 0; i < 40 && d.alive; i++) { h.pos.set(d.pos.x - 3.5, G.physics.groundAt(d.pos.x - 3.5, d.pos.z), d.pos.z); h.angle = h.angleTo(d); h.hp = h.maxHp; G.ball.state = 'idle'; T.tap('KeyF'); G.step(1.0); if (G.state === 'dialog') T.talkAll(); } G.step(0.5); T.talkAll(); return [d.alive, G.flags.c7_droneDown, T.obj()]; }),
  (v) => v[0] === false && v[1] === true && /vent/i.test(v[2]));
is('A4 E at the seal: it will not lift; the ring, the arrow and the five grooves named; the objective is the arrow', await ev(() => { const G = game, L = T.listen(); const k = T.seal(); T.press(); T.talkAll(); L.stop(); return { k, seen: !!G.flags.c7_sealSeen, said: L.said.some((l) => /arrow/i.test(l) && /grooves/i.test(l)), obj: T.obj(), vent: !!G.flags.c7_vent, next: G.findInteractable()?.kind }; }),
  (v) => v.k === 'c7vent' && v.seen && v.said && /arrow/i.test(v.obj) && !v.vent && v.next === 'c7ring');
await shot('new-1-seal.png');
is('A5 a kick with the arrow on its rest (a dead groove): the ring jolts, he says what he sees once; the vent stays shut', await ev(() => { const G = game, L = T.listen(); T.run(12); L.stop(); return { said: L.said.filter((l) => /jolts/i.test(l)).length, vent: !!G.flags.c7_vent, once: !!G.flags.c7r_jolt }; }),
  (v) => v.said === 1 && !v.vent && v.once);
is('A6 one turn by E (to the next groove, still dead): the next kick jolts it again, a short toast; still shut', await ev(() => { const G = game, L = T.listen(); const n = T.turn(); T.run(12); L.stop(); return { n, toasts: L.toasts, vent: !!G.flags.c7_vent }; }),
  (v) => v.n === 1 && v.toasts.includes('c7r_toast_jolt') && !v.vent);
is('A7 E mashed (every 0.1 s) for three pulses: the ring never stands still for a kick, the vent stays shut', await ev(() => { const G = game; T.seal(); let turns = 0; const R = G.rooms.hamalayi.ventRing; let last = R.notch;
  for (let t = 0; t < 34; t += 0.1) { T.tap('KeyE'); G.step(0.1 - 1 / 60); if (G.state === 'dialog') T.talkAll(); if (R.notch !== last) { turns++; last = R.notch; } }
  for (let i = 0; i < 60 && (R.moving || G.hero.actT > 0); i++) G.step(0.05);
  return { turns, vent: !!G.flags.c7_vent }; }),
  (v) => v.turns >= 15 && !v.vent);
await shot('new-2-turned.png');
// a save made here, with the discs' own flags in it as a discs game would have them (c7_free1): Save, reload, Continue
const saved = await ev(() => { const G = game; G.flags.c7_free1 = true; G.save(false); return JSON.parse(localStorage.getItem('lba3_save_v1')).flags; });
await boot('&ch7stage=new', 'continue');
is('A8 the mid-stage save (with c7_free1) loads with the switch: the drone down, the seal seen, the arrow back on its rest, the objective the arrow', await ev(() => { const G = game; G.step(0.5); T.talkAll(); const R = G.rooms.hamalayi?.ventRing; return { key: G.flags.chapterKey, room: G.room?.id, seen: !!G.flags.c7_sealSeen, drone: !!G.flags.c7_droneDown, notch: R?.notch, vent: !!G.flags.c7_vent, obj: T.obj() }; }),
  (v) => v.key === 'observatory' && v.room === 'hamalayi' && v.seen && v.drone && v.notch === 0 && !v.vent && /arrow/i.test(v.obj));
is('A9 two turns by E put the arrow on the live groove; left be, the next kick opens the vent once: his line, Arthur\'s call, the mountain goes still', await ev(() => { const G = game, R = G.rooms.hamalayi.ventRing, L = T.listen(); const turns = [T.turn(), T.turn()];
  let opened = 0; const o0 = G.story.cur.openVent.bind(G.story.cur); G.story.cur.openVent = (...a) => { opened++; return o0(...a); };
  T.run(24, () => G.flags.c7_vent && G.state === 'play'); T.run(13); G.story.cur.openVent = o0; L.stop();
  return { turns, aligned: R.notch === R.live, vent: !!G.flags.c7_vent, opened, there: L.said.some((l) => /wants out/i.test(l)), arthur: L.said.some((l) => /Arthur/.test(l)), line: G.rooms.hamalayi.line.active, obj: T.obj(), ring: G.findInteractable()?.kind ?? null }; }),
  (v) => v.turns[0] === 1 && v.turns[1] === 2 && v.aligned && v.vent && v.opened === 1 && v.there && v.arthur && v.line === false && /Hesk/i.test(v.obj) && v.ring !== 'c7ring' && v.ring !== 'c7vent');
await shot('new-3-open.png');
is('A10 chapter 7 ends: the monastery gate, the next chapter (evacuation)', await ev(() => { const G = game, g = G.rooms.hamalayi.monastery.gate; T.tp(g.x, g.z + 1); G.step(0.5); T.talkAll(); G.step(1.5); T.talkAll(); return [G.flags.c7_done, G.flags.chapterKey]; }),
  (v) => v[0] === true && v[1] === 'evacuation');

// ------------------------------------------------------------------ B: the switch off, the same mid-stage save
if (ONLY.includes('B')) {
await ev((f) => { const s = JSON.parse(localStorage.getItem('lba3_save_v1')); s.flags = f; s.room = 'hamalayi'; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); }, { ...saved, c7_free1: false });
await boot('&ch7stage=old', 'continue');
is('B1 without the switch the mid-stage save loads into the discs\' game: five discs, three breathing, the objective counts them', await ev(() => { const G = game; G.step(0.5); T.talkAll(); const M = G.rooms.hamalayi; return { key: G.flags.chapterKey, ring: !!M.ventRing, discs: M.ventDiscs.length, breathing: G.story.cur.breathing(), obj: T.obj() }; }),
  (v) => v.key === 'observatory' && !v.ring && v.discs === 5 && v.breathing === 3 && /5/.test(v.obj));
is('B2 the two iced discs freed by thrown balls and the seal opened by E: the vent breathes', await ev(() => { const G = game, M = G.rooms.hamalayi, V = M.vent, h = G.hero;
  const throwAt = (D) => { const a = Math.atan2(D.x - V.x, D.z - V.z); T.tp(D.x + Math.sin(a) * 3.2, D.z + Math.cos(a) * 3.2); h.angle = Math.atan2(D.x - h.pos.x, D.z - h.pos.z); h.hp = h.maxHp; G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(1.6); T.talkAll(); };
  for (const D of M.ventDiscs.filter((d) => !d.warm)) for (let k = 0; k < 3 && !D.free; k++) throwAt(D);
  T.tp(V.x + 3.7, V.z + 0.3, -Math.PI / 2); G.step(0.3); T.tap('KeyE'); G.step(1.6); T.talkAll(); return { breathing: G.story.cur.breathing(), vent: !!G.flags.c7_vent }; }),
  (v) => v.breathing === 5 && v.vent);

}
}

// ------------------------------------------------------------------ C: a chapter-7 save from before CAMPAIGN-5
// (no ob_v / ps_v: the rope lift's line does not run in it, so the stage keeps the kicks on a clock of its own)
if (ONLY.includes('C')) {
  await boot('&ch7stage=new', 'new');
  await ev(() => { const G = game; T.talkAll();
    Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 5, chapterKey: 'pass', c6_started: true, c6_bridge: true, c6_heat: true, c6_thawed: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true });
    G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
    Object.assign(G.flags, { rf_roof: true, c7_keeper: true, c7_ice: true, c7_lit: true, c7_sendell: true, c7_scope: true, c7_droneSeen: true, c7_droneDown: true, c7_sealSeen: true });
    for (const k of ['ob_v', 'ob_snow', 'ob_follow', 'ob_dir', 'ps_v', 'rf_v', 'rf_shut']) delete G.flags[k];
    const V = G.rooms.hamalayi.vent; T.tp(V.x + 6, V.z + 6); G.save(false); });
  await boot('&ch7stage=new', 'continue');
  is('C1 an old chapter-7 save at the seal (no ob_v/ps_v) loads with the switch: the line still, the stage open, the arrow on its rest', await ev(() => { const G = game; G.step(0.5); T.talkAll(); const M = G.rooms.hamalayi; return { key: G.flags.chapterKey, line: M.line.active, ob: !!G.flags.ob_v, notch: M.ventRing?.notch, obj: T.obj() }; }),
    (v) => v.key === 'observatory' && v.line === false && !v.ob && v.notch === 0 && /arrow/i.test(v.obj));
  is('C2 the kicks still come on the stage\'s own clock (the live groove\'s snow), and two turns + a kick open the vent', await ev(() => { const G = game, R = G.rooms.hamalayi.ventRing; let bursts = 0; const b0 = G.particles.burst.bind(G.particles); G.particles.burst = (...a) => { bursts++; return b0(...a); };
    T.seal(); T.run(12); const seen = bursts; G.particles.burst = b0; const turns = [T.turn(), T.turn()]; T.run(26, () => G.flags.c7_vent && G.state === 'play'); T.talkAll();
    return { seen, turns, vent: !!G.flags.c7_vent, obj: T.obj() }; }),
    (v) => v.seen >= 18 && v.turns[1] === 2 && v.vent && /Hesk/i.test(v.obj));
}

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
