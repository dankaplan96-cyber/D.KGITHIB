// ACTION-SOUND (wave 6): each action and world event asks for its own sound, once, and the engine plays it once.
// Played through the real game (the player harness, real keys for the ball), the sounds checked are the ones the
// engine actually started (AudioEngine.sfxRecent, after its merging, thinning and distance), not the calls alone.
//   1. the house: the cupboard's ball (the found gesture); the door out is 'doorIn', once per crossing, three times in
//      and out; a search with nothing (rummage + a shrug) is not a search with something; a shut door rattles
//   2. pickups: a run of kashes (one take each, not merged), a heart and a flask with their own sounds; a bin searched
//      with a hop (rummage, then the bonus pops), and hopped at again once empty (no rummage)
//   3. the depot (chapter 2 by its flags): the ball off the fence (a wall bounce, never a hit) and onto the guard (its
//      'pling' and the material, no bounce, the generic 'hit' given way); one catch per throw
//   4. distance: the same alert near and 25 m off (quieter, to the side); a small impact 60 m off is skipped, a
//      telegraph never is
//   5. a crowd: 40 sounds at once: feet and ticks thinned first, every important one played
//   6. a line of dialogue: the effects and ambience step back (-4 dB) and come back after
// Automated runtime only (headless, SwiftShader): nothing here says how anything sounds.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
check('the audio context runs (the first click)', await ev(() => game.audio.ctx?.state === 'running'), await ev(() => game.audio.ctx?.state));
await ev(() => {
  const A = game.audio;
  window.SND = { asked: [], reset() { A.sfxRecent = []; this.asked = []; }, played: () => (A.sfxRecent || []).map((r) => r.name) };
  const p0 = A.play.bind(A); A.play = (n, at) => { SND.asked.push(n); return p0(n, at); };
});

// 1. the house: the cupboard (the ball: the found box's own gesture), the door out and in three times; then a search
// with nothing and one with something, a locked door (ISO: the base handlers called with a made-up spot, as the
// interact key would call them), and a bin outdoors searched with a hop (real keys) and hopped at again once empty
const house = await ev(() => {
  const G = game, out = {}; P.settle();
  const cup = (G.room.searches || []).find((s) => s.id === 'cupboard');
  if (cup && !G.searched.includes('cupboard')) { SND.reset(); P.use(cup.x, cup.z); out.cupboard = SND.played(); }
  out.doors = [];
  for (let i = 0; i < 3; i++) {
    SND.reset(); const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle();
    const outN = SND.played().filter((n) => n === 'doorIn').length;
    SND.reset(); const d = G.world.houses[0].door; P.through(d.x, d.z); P.settle();
    out.doors.push([outN, SND.played().filter((n) => n === 'doorIn').length, G.room?.id ?? 'citadel']);
  }
  const h = G.hero, base = G.story.chapters[0];
  const wait = () => { const t0 = performance.now(); while (performance.now() - t0 < 700) { /* past the gaps */ } };
  SND.reset(); base.baseInteract({ kind: 'roomsearch', spot: { id: 'as_test_empty', x: h.pos.x, z: h.pos.z } }); P.settle(); out.empty = SND.played(); wait();
  SND.reset(); base.baseInteract({ kind: 'roomsearch', spot: { id: 'as_test_full', x: h.pos.x, z: h.pos.z, reward: 'coin' } }); G.step(1.2); P.settle(); out.full = SND.played(); wait();
  SND.reset(); base.baseInteract({ kind: 'shut', id: 'as_test' }); P.settle(); out.shut = SND.played();
  G.searched = G.searched.filter((id) => !id.startsWith('as_test'));
  return out;
});
console.log('house', JSON.stringify(house));
check('the cupboard (the magic ball): the found box\'s gesture, once, not the treasure jingle', !house.cupboard || (house.cupboard.filter((n) => n === 'found').length === 1 && !house.cupboard.includes('chest')), house.cupboard);
check('the door out and in, three times: one doorIn per crossing', house.doors.length === 3 && house.doors.every(([a, b]) => a === 1 && b === 1), house.doors);
check('a search with nothing: searchEmpty (rummage, a shrug), no treasure sound', house.empty.includes('searchEmpty') && !house.empty.includes('search') && !house.empty.includes('chest'), house.empty);
check('a search with something: search, then the kash taken', house.full.includes('search') && !house.full.includes('searchEmpty'), house.full);
check('a door shut with a reason: the handle against its lock (doorLocked), not the interface\'s deny', house.shut.includes('doorLocked') && !house.shut.includes('deny'), house.shut);

// 2. pickups (in the house: a line of six kashes ahead of him, drawn in one by one; then a heart and a flask);
// outdoors a bin searched with a hop, then hopped at again
const picks = await ev(() => {
  const G = game, h = G.hero, A = G.audio; P.settle();
  SND.reset();
  const fx = Math.sin(h.angle), fz = Math.cos(h.angle);
  for (let i = 0; i < 6; i++) G.pickups.spawn('coin', h.pos.x + fx * (1.2 + 0.6 * i), h.pos.y + 0.6, h.pos.z + fz * (1.2 + 0.6 * i), {});
  G.step(1.5);
  const coins = (A.sfxRecent || []).filter((r) => r.name === 'coin');
  const askedCoins = SND.asked.filter((n) => n === 'coin').length;
  SND.reset(); h.hp = Math.max(1, h.hp - 4); G.pickups.spawn('heart', h.pos.x, h.pos.y + 0.6, h.pos.z, {}); G.step(0.6);
  const life = SND.played();
  SND.reset(); h.magicLevel = Math.max(1, h.magicLevel || 0); h.mp = 0; G.pickups.spawn('flask', h.pos.x, h.pos.y + 0.6, h.pos.z, {}); G.step(0.6);
  const magic = SND.played();
  // a bin outside: the first hop searches it (rummage, then its bonus pops out), the second finds it taken (no rummage)
  const e = G.room?.exits?.find((x) => !x.room); if (e) { P.through(e.x, e.z); P.settle(); }
  SND.reset(); const r1 = P.rummage(); const bin1 = SND.played();
  let bin2 = null;
  if (r1.id) { const gv = G.givers().find((q) => q.id === r1.id); SND.reset(); P.go(gv.x, gv.z, { tol: gv.r * 0.6, maxT: 20 }); P.face(gv.x, gv.z, 1.0); P.tap('Space', 0.2); P.wait(1.4); bin2 = SND.played(); }
  { const d = G.world.houses[0].door; P.through(d.x, d.z); P.settle(); }   // (back in: the depot is reached from a room, as ball-close.mjs)
  return { askedCoins, coins: coins.length, steps: coins.map((c) => c.t), life, magic, r1, bin1, bin2, stats: { ...A.sfxStats } };
});
check('kashes drawn in one by one (a line of six ahead of him): one coin take per kash taken, none merged (at least 3 taken)', picks.askedCoins >= 3 && picks.coins === picks.askedCoins, picks);
check('a heart: pickLife; a flask: pickMagic (not the refill triad, not each other)', picks.life.includes('pickLife') && !picks.life.includes('heal') && picks.magic.includes('pickMagic') && !picks.magic.includes('pickLife'), picks);
check('a bin searched with a hop: the rummage, then the bonus popping out', !!picks.r1.id && picks.bin1.includes('rummage') && picks.bin1.includes('bonus'), { r1: picks.r1, bin1: picks.bin1 });
check('the same bin hopped at again, now empty: no rummage (a plain jump)', !!picks.bin2 && !picks.bin2.includes('rummage'), picks.bin2);

// 3. the depot: the ball (ball-close.mjs's setup)
const depot = await ev(() => {
  const G = game, f = G.flags, h = G.hero, B = G.ball; P.settle();
  Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'project', c1_started: true, c1_home: true, c1_arrived: true, c1_task: true, c1_depotWarned: true });
  f.chapter = G.story.chapters.findIndex((c) => c.key === 'project');
  h.hasBall = true; h.magicLevel = Math.max(1, h.magicLevel || 0); G.story.refreshCast();
  const v = G.world.valves.find((q) => q.id === 'depot');
  G.exitRoom({ x: v.x - 5, z: v.z - 2, a: 0 }, true); P.settle(); G.step(0.5);
  const watch = G.enemies.filter((e) => e.def?.watch);
  for (const e of watch) { e.update = () => {}; e.pos.set(-200, 0, -200); e.sync?.(); }
  const evs = [];
  const b0 = B.bounce.bind(B); B.bounce = function (k) { evs.push('b:' + k); return b0(k); };
  const H0 = B.onHit.bind(B); B.onHit = function (hit) { evs.push('hit:' + (hit.enemy ? 'enemy' : hit.result)); return H0(hit); };
  const throwOnce = (hx, hz, a, enemy, d) => {
    for (let i = 0; i < 240 && (B.state !== 'idle' || h.combat.busy); i++) G.step(1 / 60);
    G.step(0.3);
    const hy = G.physics.groundAt(hx, hz, h.pos.y + 2);
    h.pos.set(hx, hy, hz); h.angle = a; h.mp = h.mpMax; h.sync?.();
    if (enemy) { const ex = hx + Math.sin(a) * d, ez = hz + Math.cos(a) * d; enemy.hp = enemy.maxHp; enemy.pos.set(ex, G.physics.groundAt(ex, ez, hy + 2), ez); enemy.angle = a + Math.PI; enemy.sync?.(); G.story.depot.hostile = true; }
    evs.length = 0; SND.reset();
    const keys = G.input.keys, I = G.input; let thrown = false;
    keys.add('KeyF'); I.taps.add('KeyF'); G.step(1 / 60); keys.delete('KeyF');
    for (let i = 0; i < 360; i++) { h.pos.x = hx; h.pos.z = hz; h.angle = a; G.step(1 / 60); if (B.state !== 'idle' && B.state !== 'inhand') thrown = true; if (thrown && B.state === 'idle') break; }
    if (enemy) { enemy.pos.set(-200, 0, -200); enemy.sync?.(); }
    return { thrown, home: B.state === 'idle', evs: evs.slice(), played: SND.played(), asked: SND.asked.slice() };
  };
  // the fence: facing it from 1.5 m (FENCE: the depot's own, as ball-close.mjs: it stands north of the valve)
  const D = G.world.depot, fence = D?.fence || null;
  const out = { fence: null, enemy: null };
  // throw toward the yard's nearest solid face: the first direction from here with something solid within 3 m
  let best = null;
  for (let k = 0; k < 16 && !best; k++) { const a = (k / 16) * Math.PI * 2; for (let r = 0.8; r < 3; r += 0.1) if (G.physics.solidAt(h.pos.x + Math.sin(a) * r, h.pos.z + Math.cos(a) * r, h.pos.y + 1.4, 0.2)) { best = { a, r }; break; } }
  if (best) out.fence = throwOnce(h.pos.x, h.pos.z, best.a, null, 0);
  const guard = watch.find((e) => e.def.kind === 'guard') || watch[0];
  if (guard) out.enemy = throwOnce(v.x - 6, v.z - 2, Math.PI, guard, 3);
  void fence;
  return out;
});
const cnt = (arr, re) => (arr || []).filter((n) => re.test(n)).length;
const F = depot.fence, E = depot.enemy;
check('ball at a wall: each bounce sounds as a bounce (wall or ground), never as a hit; one per bounce event at most', !!F && F.thrown && cnt(F.played, /^bounce(Wall|Ground)$/) >= 1 && cnt(F.played, /^bounce(Wall|Ground)$/) <= cnt(F.evs, /^b:/) && !F.played.includes('ballHit'), F);
check('ball at a wall: the wall bounce has its own sound (bounceWall), not the old shared one', !!F && F.evs.includes('b:wall') ? F.played.includes('bounceWall') && !F.played.includes('bounce') : true, F);
check('ball at a wall: one catch when it comes home', !!F && F.home && cnt(F.played, /^catch$/) === 1, F);
check('ball at the guard: its pling and the material, no bounce at the strike, never the bare "hit"', !!E && E.evs.includes('hit:enemy') && E.played.includes('ballHit') && cnt(E.played, /^hit(Flesh|Machine|Crystal|Stone|Wood)$|^clang$/) >= 1 && !E.played.includes('hit') && !cnt(E.played, /^bounce/), E);
check('ball at the guard: one catch per throw', !!E && E.home && cnt(E.played, /^catch$/) === 1, E);

// 4. distance and side
const space = await ev(() => {
  const G = game, A = G.audio, h = G.hero, cam = G.camera; G.step(0.1);
  const L = A.listener, r = { x: L.rx, z: L.rz };
  const take = (name, d, side = 1) => { SND.reset(); const ok = A.play(name, { x: h.pos.x + r.x * d * side, z: h.pos.z + r.z * d * side }); const t = A.sfxRecent.at(-1); return { ok, gain: ok ? t.gain : null, pan: ok ? t.pan : null }; };
  const wait = () => { const t0 = performance.now(); while (performance.now() - t0 < 420) { /* past the gap */ } };
  const near = take('alert', 1); wait();
  const far = take('alert', 25); wait();
  const left = take('alert', 25, -1); wait();
  const tiny = take('hitWood', 60); wait();
  const tele = take('zap', 60);
  void cam;
  return { near, far, left, tiny, tele };
});
check('a sound by him at full level, centred', space.near.ok && space.near.gain === 1 && Math.abs(space.near.pan) < 0.2, space);
check('the same sound 25 m to his right: quieter (4/25) and to the right; to his left: to the left', space.far.ok && Math.abs(space.far.gain - 0.16) < 0.02 && space.far.pan > 0.3 && space.left.pan < -0.3, space);
check('a small impact 60 m off is skipped; an enemy telegraph there still plays (quiet)', !space.tiny.ok && space.tele.ok && space.tele.gain < 0.1, space);

// 4b. one blow, two calls (an enemy's damage() asks for 'hit', the impact for its material in the same step): the
// material sounds, 'hit' gives way before it has begun
const yieldT = await ev(() => {
  const A = game.audio, t0 = performance.now(); while (performance.now() - t0 < 300) { /* past the gaps */ }
  SND.reset(); const a = A.play('hit'), b = A.play('hitFlesh'); const played = SND.played();
  const t1 = performance.now(); while (performance.now() - t1 < 300) { /* */ }
  SND.reset(); const c = A.play('hitWood'), d = A.play('hit');
  return { a, b, played, c, d };
});
check('"hit" then a material in one step: the material plays and "hit" is silenced; the other way round "hit" is merged', yieldT.a && yieldT.b && yieldT.c && !yieldT.d, yieldT);

// 5. a crowd at once
const crowd = await ev(() => {
  const A = game.audio; SND.reset(); const s0 = { ...A.sfxStats };
  const small = ['step-stone', 'tick', 'blip', 'bonus', 'jump'], mid = ['swing', 'punch', 'whoosh', 'hitWood', 'hitStone', 'clunk', 'pulse', 'break', 'throw', 'lockOn', 'equip'], big = ['hurt', 'alert', 'deny', 'catch', 'chest', 'doorIn', 'found'];
  const res = {};
  for (let i = 0; i < 2; i++) for (const n of [...mid, ...small]) res[n + i] = A.play(n);
  for (const n of big) res[n] = A.play(n);
  const s1 = A.sfxStats;
  return { bigAll: big.every((n) => res[n]), dropped: s1.dropped - s0.dropped, live: A._live.length, smallPlayed: small.filter((n) => res[n + '0']).length };
});
check('a crowd of 40 at once: every important one plays, others thinned (feet and ticks first), at most 16 + the important ones', crowd.bigAll && crowd.dropped > 0 && crowd.live <= 16 + 7, crowd);

// 6. dialogue: the effects step back
const duck = await ev(async () => {
  const G = game, A = G.audio, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g0 = A.fxDuck.gain.value;
  G.say('', ['A short line to hear the effects step back.']);
  // (on the audio clock: a busy headless context may run behind real time, so wait for 0.4 s of it, at most 4 s)
  const c0 = A.ctx.currentTime; for (let i = 0; i < 40 && A.ctx.currentTime - c0 < 0.4; i++) await sleep(100);
  const under = A.fxDuck.gain.value;
  for (let i = 0; i < 20 && G.state !== 'play'; i++) { P.tap('KeyE', 0.05); G.step(0.3); await sleep(50); }
  await sleep(500); const c1 = A.ctx.currentTime; for (let i = 0; i < 60 && A.ctx.currentTime - c1 < 1.6; i++) await sleep(100);
  const after = A.fxDuck.gain.value;
  return { g0: +g0.toFixed(3), under: +under.toFixed(3), after: +after.toFixed(3), state: G.state };
});
check('a line of dialogue: effects and ambience down to ~0.63 (-4 dB), back to 1 after it', Math.abs(duck.g0 - 1) < 0.02 && Math.abs(duck.under - 0.63) < 0.05 && duck.after > 0.95, duck);
const stats = await ev(() => ({ ...game.audio.sfxStats }));
console.log('sfxStats', JSON.stringify(stats));

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
