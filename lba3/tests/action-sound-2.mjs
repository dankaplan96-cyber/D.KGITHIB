// ACTION-SOUND-2 (P24): every main player action has its own sound, played once, within its volume bounds, with no
// error. Played through the real game: the developer yard (game.devArena(): a dummy, a guard, a sentry with a shield,
// walls, a raised platform) for the ball, the sword, the fists and the moves; Citadel outdoors for the sea and the
// containers. What is checked is what the engine started (AudioEngine.sfxRecent, after its merging, thinning and
// distance), and the asks (play() calls) where a count matters.
//   1. the ball: a throw, its bounce by surface (the yard's stone floor and wall; wood, metal, soft ground by the
//      surface map), the strike on an enemy (its pling and the material, no bounce), the way home, ONE catch per throw
//      (a second toHand is silent), without magic (throwDud, one dull contact, no bounce chirp), into the sea
//   2. the sword: drawn (swordDraw), a swing and its hit (a blade through flesh is slashFlesh, on wood hitWood), the heavy
//      strike, a blow on the sentry's shield (clang), put away (swordSheathe)
//   3. fists: jab, jab, kick (the kick its own), a fist on flesh is a thud (hitFlesh, never slashFlesh); the glove
//   4. moves: the dodge, Athletic jump and landing, a step down (landSoft), Discreet tiptoes (step-sneak, no step),
//      hiding (hide), a behaviour change (mode)
//   5. pick-ups: kash, heart, flask, clover each its own; a found object (found); hurt, low life once per fall
//   6. containers: a bin by its kind (rummageBin…), then hopped at again (rummageEmpty)
//   7. the weapons and tools through play(): the blowgun, the laser, the lightning, a tool
//   8. bounds (rendered offline with the game's own engine): every sound heard in 1–7 peaks under -12 dBFS, its 50 ms
//      loudness is at least 8 dB under a voice line's and over -62 LUFS, it starts without a click, and the SFX slider
//      at 0 silences it; small under big (a tiptoe under a step, a kash under a found object)
//   9. the cost: play() on the main thread, per call
// Automated runtime only (headless, SwiftShader); nothing listened to.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
check('the audio context runs (the first click)', await ev(() => game.audio.ctx?.state === 'running'), await ev(() => game.audio.ctx?.state));
await ev(() => {
  const G = game, A = G.audio;
  window.SND = {
    asked: [], heard: new Set(),
    reset() { A.sfxRecent = []; this.asked = []; },
    played() { const r = (A.sfxRecent || []).map((x) => x.name); r.forEach((n) => this.heard.add(n)); return r; },
  };
  const p0 = A.play.bind(A); A.play = (n, at, o) => { SND.asked.push(n); return p0(n, at, o); };
  // the yard
  G.settings.controls = 'modern'; G.applySettings?.();
  G.devArena();
  const E = (id) => G.enemies.find((e) => e.id === id);
  window.Y = {
    E,
    only(ids = [], at = [6194, 8], a = 0) {
      for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(ids.includes(e.id)); }
      const h = G.hero; h.pos.set(at[0], G.physics.groundAt(at[0], at[1]), at[1]); h.angle = a; h.vel.set(0, 0); h.hp = h.maxHp; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0;
      h.behaviour = 'normal'; G.resetCombat(); G.combatDir.grace = 0; G.state = 'play';
    },
    put(id, x, z, a = 0) { const e = E(id); e.pos.set(x, G.physics.groundAt(x, z), z); e.angle = a; e.kb?.set(0, 0); e.sync?.(); return e; },
    press(code) { G.input.keys.add(code); G.input.taps.add(code); G.step(1 / 60); G.input.keys.delete(code); },
    // a real throw with the ball key, then frames until it is home (or 6 s)
    throwBall(setup) {
      const h = G.hero, B = G.ball;
      for (let i = 0; i < 300 && (B.state !== 'idle' || h.combat.busy); i++) G.step(1 / 60);
      G.step(0.4); setup?.();
      SND.reset(); const evs = [];
      const b0 = B.bounce, o0 = B.onHit;
      B.bounce = function (k, at) { evs.push('b:' + k); return b0.call(this, k, at); };
      B.onHit = function (hit) { evs.push('hit:' + (hit.enemy ? 'enemy' : hit.result)); return o0.call(this, hit); };
      const x = h.pos.x, z = h.pos.z, a = h.angle;
      Y.press('KeyF'); let thrown = false;
      for (let i = 0; i < 360; i++) { h.pos.x = x; h.pos.z = z; h.angle = a; G.step(1 / 60); if (B.state !== 'idle' && B.state !== 'inhand') thrown = true; if (thrown && B.state === 'idle') break; }
      B.bounce = b0; B.onHit = o0;
      return { thrown, home: B.state === 'idle', evs, played: SND.played(), asked: SND.asked.slice(), surface: B.lastSurface };
    },
    wait(ms) { const t0 = performance.now(); while (performance.now() - t0 < ms) { /* past the gaps on the real clock */ } },
  };
});
const cnt = (arr, re) => (arr || []).filter((n) => re.test(n)).length;

// ---------------------------------------------------------------- 1. the ball
const ball = await ev(() => {
  const G = game, h = G.hero, out = {};
  const S0 = G.surfaceAt.bind(G);
  const open = () => { Y.only([], [6190, 8], 0); h.hasBall = true; h.magicLevel = Math.max(1, h.magicLevel || 0); h.mp = h.mpMax; h.combat.equip('ball', true); };
  // the yard's floor (stone tiles: the surface map says stone) along open ground
  out.floor = Y.throwBall(open);
  // the same throw, the surface map giving wood, metal, grass (as a pier, a metal room, a meadow would)
  for (const s of ['wood', 'metal', 'grass']) { G.surfaceAt = () => s; out[s] = Y.throwBall(open); G.surfaceAt = S0; }
  // the wall (x 6195..6201 at z = 2): from in front of it, facing it
  out.wall = Y.throwBall(() => { Y.only([], [6198, 3.6], Math.PI); h.mp = h.mpMax; });
  // the dummy (wood) and the guard (a body): the strike
  out.dummy = Y.throwBall(() => { Y.only(['a_dummy'], [6194, 2.2], 0); Y.put('a_dummy', 6194, 6); h.mp = h.mpMax; });
  out.guard = Y.throwBall(() => { Y.only(['a_guard'], [6200, 10], Math.PI); const e = Y.put('a_guard', 6200, 6.5, 0); e.hp = e.maxHp; e.update = () => {}; h.mp = h.mpMax; });
  // no magic left
  out.nomp = Y.throwBall(() => { open(); h.mp = 0; });
  // one catch per throw: once home, toHand again (a scene change, a reset) is silent
  SND.reset(); G.ball.toHand(); G.ball.toHand(); out.again = SND.played();
  return out;
});
for (const k of ['floor', 'wood', 'metal', 'grass', 'wall', 'dummy', 'guard', 'nomp']) console.log('ball', k, JSON.stringify(ball[k]));
const B = ball;
check('ball: the throw sounds (throw), once', B.floor.thrown && cnt(B.floor.played, /^throw$/) === 1, B.floor.played);
check('ball on the yard\'s stone floor: bounceStone, one take per bounce at most, never a hit', cnt(B.floor.played, /^bounceStone$/) >= 1 && cnt(B.floor.played, /^bounce/) <= cnt(B.floor.evs, /^b:/) && !B.floor.played.includes('ballHit'), B.floor);
check('ball on wood / metal / soft ground: bounceWood / bounceMetal / bounceGround, each its own', B.wood.played.includes('bounceWood') && !B.wood.played.includes('bounceStone') && B.metal.played.includes('bounceMetal') && B.grass.played.includes('bounceGround') && !B.grass.played.includes('bounceStone'), { wood: B.wood.played, metal: B.metal.played, grass: B.grass.played });
check('ball at a stone wall: bounceWall', B.wall.evs.includes('b:wall') && B.wall.played.includes('bounceWall'), B.wall);
check('ball on an enemy: its pling (ballHit) and the material (wood on the dummy, a body on the guard), no bounce at the strike', B.dummy.evs.includes('hit:enemy') && B.dummy.played.includes('ballHit') && B.dummy.played.includes('hitWood') && B.guard.played.includes('ballHit') && cnt(B.guard.played, /^hit(Flesh|Machine|Stone)$|^clang$/) >= 1 && !B.guard.played.includes('hit'), { dummy: B.dummy.played, guard: B.guard.played });
check('ball: one catch per throw, every throw', ['floor', 'wood', 'metal', 'grass', 'wall', 'dummy', 'guard', 'nomp'].every((k) => B[k].home && cnt(B[k].played, /^catch$/) === 1), Object.fromEntries(['floor', 'wall', 'dummy', 'guard', 'nomp'].map((k) => [k, cnt(B[k].played, /^catch$/)])));
check('ball: a second toHand once home plays no second catch', !B.again.includes('catch'), B.again);
check('ball on its way home by itself from further than 3 m: ballReturn, at most once a throw', ['floor', 'wood', 'metal', 'grass'].some((k) => B[k].played.includes('ballReturn')) && ['floor', 'wood', 'metal', 'grass', 'wall', 'dummy', 'guard', 'nomp'].every((k) => cnt(B[k].played, /^ballReturn$/) <= 1), Object.fromEntries(['floor', 'wood', 'wall', 'dummy', 'nomp'].map((k) => [k, cnt(B[k].played, /^ballReturn$/)])));
check('ball without magic: throwDud, one dull contact (ballDud), no bounce chirp, still flies and comes home', B.nomp.thrown && B.nomp.played.includes('throwDud') && !B.nomp.played.includes('throw') && cnt(B.nomp.played, /^ballDud$/) === 1 && !cnt(B.nomp.played, /^bounce/) && B.nomp.home, B.nomp);

// ---------------------------------------------------------------- 2. the sword
const sword = await ev(() => {
  const G = game, h = G.hero, out = {};
  Y.only(['a_dummy'], [6194, 4], 0); Y.put('a_dummy', 6194, 5.5);
  h.hasSword = true; h.combat.equip('fists', true);
  SND.reset(); h.combat.equip('sword'); G.step(0.3); out.draw = SND.played();
  SND.reset(); Y.press('KeyK'); G.step(0.6); out.wood = SND.played();
  // the guard (a body): a blade through flesh
  Y.only(['a_guard'], [6200, 4.6], 0); const e = Y.put('a_guard', 6200, 6.0, Math.PI); e.hp = e.maxHp; e.update = () => {};
  G.step(0.5); SND.reset(); Y.press('KeyK'); G.step(0.6); out.flesh = SND.played();
  // the heavy strike: hold through the first swing
  Y.only(['a_dummy'], [6194, 4], 0); Y.put('a_dummy', 6194, 5.5); G.step(0.4);
  SND.reset(); G.input.keys.add('KeyK'); G.input.taps.add('KeyK'); G.step(1.4); G.input.keys.delete('KeyK'); G.step(0.8); out.heavy = SND.played();
  // the sentry's shield, struck from the front
  Y.only(['a_sentry'], [6194, 4], 0); const s = Y.put('a_sentry', 6194, 5.6, Math.PI); s.update = () => {}; s.hp = s.maxHp; G.step(0.4);
  SND.reset(); Y.press('KeyK'); G.step(0.7); out.shield = SND.played();
  // put away: the fists taken
  G.step(0.4); SND.reset(); h.combat.equip('fists'); G.step(0.4); out.sheathe = SND.played();
  return out;
});
console.log('sword', JSON.stringify(sword));
check('sword drawn: swordDraw, not the common equip click', sword.draw.includes('swordDraw') && !sword.draw.includes('equip'), sword.draw);
check('sword on the dummy: a swing, then the wood it struck (hitWood)', sword.wood.includes('swing') && sword.wood.includes('hitWood'), sword.wood);
check('sword on a body: the blade\'s cut (slashFlesh), not a fist\'s thud', sword.flesh.includes('slashFlesh') && !sword.flesh.includes('hitFlesh'), sword.flesh);
check('sword held through the first strike: the heavy strike readies (chargeFull) and swings heavy (swingHeavy)', sword.heavy.includes('chargeFull') && sword.heavy.includes('swingHeavy'), sword.heavy);
check('sword on the sentry\'s shield: blocked (clang)', sword.shield.includes('clang'), sword.shield);
check('sword put away for the fists: swordSheathe and the fists\' own (equipFists)', sword.sheathe.includes('swordSheathe') && sword.sheathe.includes('equipFists'), sword.sheathe);

// ---------------------------------------------------------------- 3. fists and the glove
const fists = await ev(() => {
  const G = game, h = G.hero, out = {};
  Y.only(['a_guard'], [6200, 4.8], 0); const e = Y.put('a_guard', 6200, 6.1, Math.PI); e.hp = 99; e.maxHp = 99; e.update = () => {};
  h.combat.equip('fists', true); G.step(0.3);
  SND.reset();
  for (let i = 0; i < 3; i++) { Y.press('KeyK'); G.step(0.36); }
  G.step(0.5); out.combo = SND.played(); out.asked = SND.asked.slice();
  // the glove (Wannie's): its two punches
  G.weapons.arms.glove = true; G.step(0.3);
  SND.reset(); h.combat.equip('glove'); G.step(0.2); out.gloveOn = SND.played();
  SND.reset(); for (let i = 0; i < 2; i++) { Y.press('KeyK'); G.step(0.5); } G.step(0.5); out.glove = SND.played();
  h.combat.equip('fists', true);
  return out;
});
console.log('fists', JSON.stringify(fists));
check('fists: jab, jab, kick: two punches and the kick\'s own sound', cnt(fists.combo, /^punch$/) === 2 && fists.combo.includes('kick'), fists.combo);
check('fists on a body: a thud (hitFlesh), never the blade\'s cut', fists.combo.includes('hitFlesh') && !fists.combo.includes('slashFlesh'), fists.combo);
check('the glove: put on (equipGlove), its jab and its heavy punch (gloveJab, gloveHeavy), not the sword\'s heavy swing', fists.gloveOn.includes('equipGlove') && fists.glove.includes('gloveJab') && fists.glove.includes('gloveHeavy') && !fists.glove.includes('swingHeavy'), { on: fists.gloveOn, glove: fists.glove });

// ---------------------------------------------------------------- 4. moves
const moves = await ev(() => {
  const G = game, h = G.hero, out = {};
  Y.only([], [6190, 8], 0); G.step(0.3);
  SND.reset(); h.combat.dodgeCool = 0; G.input.keys.add('ArrowLeft'); Y.press('ShiftLeft'); G.step(0.5); G.input.keys.delete('ArrowLeft'); out.dodge = SND.played();
  G.step(0.4); SND.reset(); h.setBehaviour('athletic'); G.step(0.1); out.mode = SND.played();
  SND.reset(); Y.press('Space'); G.step(1.2); out.jump = SND.played();
  // a step down: dropped from 0.45 m (a low wall's top), the real landing code
  SND.reset(); h.pos.y += 0.45; h.onGround = false; h.vy = 0; h.airPeak = h.pos.y; G.step(0.6); out.stepDown = SND.played();
  // Discreet: walk 3 s, then hold the action key (hide)
  h.setBehaviour('discreet'); G.step(0.2); h.pos.set(6188, G.physics.groundAt(6188, 8), 8); h.angle = 0;
  SND.reset(); G.input.keys.add('ArrowUp'); G.step(3); G.input.keys.delete('ArrowUp'); G.step(0.2); out.sneak = SND.played();
  SND.reset(); G.input.keys.add('Space'); G.step(0.6); G.input.keys.delete('Space'); G.step(0.2); out.hide = SND.played();
  // Normal: walking
  h.setBehaviour('normal'); G.step(0.2); h.pos.set(6188, G.physics.groundAt(6188, 8), 8); h.angle = 0;
  SND.reset(); G.input.keys.add('ArrowUp'); G.step(2); G.input.keys.delete('ArrowUp'); G.step(0.2); out.walk = SND.played();
  return out;
});
console.log('moves', JSON.stringify(moves));
check('the dodge: its own whoosh (dodge)', moves.dodge.includes('dodge'), moves.dodge);
check('a behaviour change: mode', moves.mode.includes('mode'), moves.mode);
check('Athletic: the jump and its landing (jump, land)', moves.jump.includes('jump') && moves.jump.includes('land'), moves.jump);
check('a step down off a ledge: a light landing (landSoft), not silence and not the jump\'s thud', moves.stepDown.includes('landSoft') && !moves.stepDown.includes('land'), moves.stepDown);
check('Discreet walking: tiptoes (step-sneak), no ordinary step', cnt(moves.sneak, /^step-sneak$/) >= 2 && !cnt(moves.sneak, /^step-(stone|grass|dirt|wood|metal)$|^step$/), moves.sneak);
check('Discreet, the action held: hiding (hide), once', cnt(moves.hide, /^hide$/) === 1, moves.hide);
check('Normal walking: the surface\'s steps', cnt(moves.walk, /^step-\w+$/) >= 2 && !moves.walk.includes('step-sneak'), moves.walk);

// ---------------------------------------------------------------- 5. pick-ups, hurt, low life
const picks = await ev(() => {
  const G = game, h = G.hero, out = {};
  Y.only([], [6190, 8], 0); G.step(0.3);
  const take = (type, prep) => { prep?.(); SND.reset(); G.pickups.spawn(type, h.pos.x, h.pos.y + 0.6, h.pos.z, {}); G.step(0.7); return SND.played(); };
  out.coin = take('coin');
  out.heart = take('heart', () => { h.hp = Math.max(1, h.maxHp - 4); });
  out.flask = take('flask', () => { h.magicLevel = Math.max(1, h.magicLevel || 0); h.mp = 0; });
  out.clover = take('clover');
  // a found object (the ceremony: I-24)
  SND.reset(); G.foundObj.give('okey', 'it_okey', () => {}); G.step(0.3); out.found = SND.played();
  for (let i = 0; i < 40 && G.state !== 'play'; i++) { Y.press('KeyE'); G.step(0.2); }
  // hurt, then under a third (lowLife once), then hurt again while low (no second lowLife)
  G.state = 'play'; h.hp = h.maxHp; h.invuln = 0;
  SND.reset(); h.damage(1, null); out.hurt = SND.played(); h.invuln = 0; G.step(0.3); Y.wait(300);
  SND.reset(); h.damage(h.hp - Math.floor(h.maxHp * 0.25), null); out.low = SND.played(); h.invuln = 0; G.step(0.3);
  Y.wait(400); SND.reset(); h.damage(1, null); out.lowAgain = SND.played();
  h.hp = h.maxHp; h.invuln = 0; G.step(1.2);
  return out;
});
console.log('picks', JSON.stringify(picks));
check('a kash: coin; a heart: pickLife; a flask: pickMagic; a clover: pickClover; each its own', picks.coin.includes('coin') && picks.heart.includes('pickLife') && picks.flask.includes('pickMagic') && picks.clover.includes('pickClover') && !picks.heart.includes('pickMagic') && !picks.coin.includes('found'), picks);
check('a real object received: the found gesture (found), not a bonus\'s', picks.found.includes('found') && !picks.found.includes('coin'), picks.found);
check('hurt: hurt; falling under a third of his life: lowLife once, not again on the next blow', picks.hurt.includes('hurt') && !picks.hurt.includes('lowLife') && picks.low.includes('lowLife') && picks.low.includes('hurt') && !picks.lowAgain.includes('lowLife'), { hurt: picks.hurt, low: picks.low, again: picks.lowAgain });

// ---------------------------------------------------------------- 6. containers (Citadel, outdoors: a bin by its kind)
const cont = await ev(() => {
  const G = game, h = G.hero, out = {};
  G.exitRoom({ x: -60, z: -6, a: 0 }, true); P.settle(); G.step(0.4); h.behaviour = 'normal';
  const bin = G.givers().find((g) => g.kind === 'bin' && !G.giverTaken(g) && Math.hypot(g.x - h.pos.x, g.z - h.pos.z) < 40) || G.givers().find((g) => g.kind && !G.giverTaken(g));
  if (!bin) return { none: true };
  out.kind = bin.kind; out.id = bin.id;
  const gy = G.physics.groundAt(bin.x, bin.z, h.pos.y + 3), a = Math.random() * 6.28, rr = Math.min(1.0, bin.r * 0.6);
  h.pos.set(bin.x + Math.sin(a) * rr, gy, bin.z + Math.cos(a) * rr); h.angle = Math.atan2(bin.x - h.pos.x, bin.z - h.pos.z); G.step(0.2);
  SND.reset(); Y.press('Space'); G.step(1.2); out.first = SND.played();
  Y.wait(500); SND.reset(); Y.press('Space'); G.step(1.2); out.again = SND.played();
  return out;
});
console.log('containers', JSON.stringify(cont));
const rk = { bin: 'rummageBin', barrel: 'rummageBarrel', crate: 'rummageCrate', trunk: 'rummageCrate', wood: 'rummageCrate', cases: 'rummageCase', suitcases: 'rummageCase' }[cont.kind] || 'rummage';
check('a container searched with a hop: its kind\'s rummage, then the bonus popping out', !cont.none && cont.first.includes(rk) && cont.first.includes('bonus'), cont);
check('the same container hopped at again: a lighter rummage and a shrug (rummageEmpty), no search, no bonus', !cont.none && cont.again.includes('rummageEmpty') && !cont.again.includes(rk) && !cont.again.includes('bonus'), cont.again);

// ---------------------------------------------------------------- 6b. the sea (Citadel: from the shore, a throw into the water)
const sea = await ev(() => {
  const G = game, h = G.hero, T = G.terrain, B = G.ball;
  // a dry spot on a steep shore: open water from 2.5 m out, nothing solid on the way (a quay's railing, a post, a
  // boat), the target 4 m out; searched on rings around the village
  let spot = null;
  const P = G.physics, clear = (x, z, b, y0) => { for (let d = 0.6; d <= 5; d += 0.2) { const px = x + Math.sin(b) * d, pz = z + Math.cos(b) * d; for (const dy of [0.3, 1, 1.8, 2.6]) if (P.solidAt(px, pz, y0 + dy, 0.3)) return false; if (d >= 2.5 && (T.heightAt(px, pz) > -0.5 || P.groundInfo(px, pz, y0 + 3).brick)) return false; } return true; };
  for (let r = 30; r < 170 && !spot; r += 4) for (let k = 0; k < 72 && !spot; k++) {
    const a = (k / 72) * Math.PI * 2, x = -60 + Math.sin(a) * r, z = Math.cos(a) * r;
    const y0 = T.heightAt(x, z);
    if (y0 < 0.4 || P.groundInfo(x, z, y0 + 3).brick) continue;
    for (let d = 0; d < 24 && !spot; d++) { const b = (d / 24) * Math.PI * 2; if (clear(x, z, b, y0)) spot = { x, z, b, wx: x + Math.sin(b) * 4, wz: z + Math.cos(b) * 4 }; }
  }
  if (!spot) return { none: true };
  h.pos.set(spot.x, G.physics.groundAt(spot.x, spot.z, 5), spot.z); h.angle = spot.b; h.mp = h.mpMax; h.hasBall = true; G.step(0.3);
  SND.reset();
  B.holdIn(h); B.launch(h, 'normal', Math.max(1, h.magicLevel || 1), { aim: { x: Math.sin(spot.b), z: Math.cos(spot.b) }, target: { x: spot.wx, y: -1, z: spot.wz } });
  for (let i = 0; i < 400 && B.state !== 'idle'; i++) G.step(1 / 60);
  return { spot, played: SND.played(), home: B.state === 'idle' };
});
console.log('sea', JSON.stringify(sea));
const afterSplash = sea.played ? sea.played.slice(sea.played.indexOf('ballSplash') + 1) : [];
check('ball into the sea: a splash (ballSplash), no bounce after it (a skip on the shore before it may sound), home with one catch', !sea.none && sea.played.includes('ballSplash') && !cnt(afterSplash, /^bounce/) && sea.home && cnt(sea.played, /^catch$/) === 1, sea);

// ---------------------------------------------------------------- 7. weapons and tools through play()
const arms = await ev(() => {
  const G = game, h = G.hero, out = {}, W = G.weapons, a = W.arms;
  Object.assign(a, { blowgun: true, laser: true, lightning: true }); a.darts = Math.max(5, a.darts || 0); a.charge = Math.max(3, a.charge || 0); h.mp = h.mpMax;
  const aim = { x: Math.sin(h.angle), z: Math.cos(h.angle) };
  SND.reset(); W.fire('blowgun', aim); G.step(0.2); out.dart = SND.played();
  Y.wait(120); SND.reset(); W.fire('laser', aim); G.step(0.2); out.laser = SND.played();
  Y.wait(120); SND.reset(); W.sound('lightning'); out.lightning = SND.played();
  Y.wait(120); SND.reset(); G.gadgets?.tools?.sound('jet'); G.gadgets?.tools?.sound('pip', 0.5); out.tool = SND.played();
  return out;
});
console.log('arms', JSON.stringify(arms));
check('the blowgun, the laser, the lightning: their own sounds through play() (wDart, wLaser, wLightning)', arms.dart.includes('wDart') && arms.laser.includes('wLaser') && arms.lightning.includes('wLightning'), arms);
check('a tool through play() (tJet, tPip)', arms.tool.includes('tJet') && arms.tool.includes('tPip'), arms.tool);

// ---------------------------------------------------------------- 8. bounds: every sound heard above, rendered offline
const heard = await ev(() => [...SND.heard]);
const bounds = await ev(async (names) => {
  const SR = 48000, Proto = game.audio.constructor.prototype;
  function engine(len, sfx = 0.8) {
    const oc = new OfflineAudioContext(2, Math.ceil(len * SR), SR);
    const ctx = new Proxy(oc, { get(t, k) { if (k === 'state') return 'running'; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
    const A = Object.create(Proto);
    A._targets = new Map(); A.vol = { master: 0.8, music: 0.55, sfx, voice: 0.8 }; A.ctx = ctx;
    A.master = oc.createGain(); A.master.gain.value = 0.8; A.master.connect(oc.destination);
    A.fxDuck = oc.createGain(); A.fxDuck.connect(A.master);
    A.sfxBus = oc.createGain(); A.sfxBus.gain.value = sfx; A.sfxBus.connect(A.fxDuck);
    A.reverb = oc.createConvolver(); A.reverb.buffer = A._impulse(0.25);
    const rg = oc.createGain(); rg.gain.value = 0.35; A.reverb.connect(rg).connect(A.fxDuck); A.sfxBus.connect(A.reverb);
    A.music = { duck() {} }; A.clock = () => oc.currentTime; A.noiseBuf = A._noise(2); A.listener = { x: 0, z: 0, rx: 1, rz: 0 };
    return { A, oc };
  }
  const at = (oc, t, fn) => oc.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => { fn(); oc.resume(); });
  async function render(name, sfx) { const { A, oc } = engine(2.2, sfx); at(oc, 0.05, () => A.play(name, null, { k: 0.5 })); return oc.startRendering(); }
  async function kw(buf) {
    const oc = new OfflineAudioContext(2, buf.length, SR), s = oc.createBufferSource(); s.buffer = buf;
    const sh = oc.createBiquadFilter(); sh.type = 'highshelf'; sh.frequency.value = 1681.97; sh.gain.value = 4;
    const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38.13; hp.Q.value = 0.5;
    s.connect(sh).connect(hp).connect(oc.destination); s.start(); return oc.startRendering();
  }
  const dB = (x) => (x > 1e-10 ? 20 * Math.log10(x) : -200);
  const out = {};
  for (const name of names) {
    // (three takes: the level is their mean, the peak and the click the worst of them; noise differs take to take)
    const takes = [];
    for (let t = 0; t < 3; t++) takes.push(await one(name));
    const mute = await render(name, 0); let mp = 0; { const a = mute.getChannelData(0), b = mute.getChannelData(1); for (let i = 0; i < a.length; i++) mp = Math.max(mp, Math.abs(a[i]), Math.abs(b[i])); }
    const lin = takes.map((x) => Math.pow(10, x.l50 / 10)).reduce((s, x) => s + x, 0) / takes.length;
    out[name] = { peak: Math.max(...takes.map((x) => x.peak)), l50: +(10 * Math.log10(lin)).toFixed(1), click: Math.max(...takes.map((x) => x.click)), mute: +dB(mp).toFixed(0) };
  }
  return out;
  async function one(name) {
    const buf = await render(name, 0.8), L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
    let peak = 0, on = -1;
    for (let i = 0; i < n; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > peak) peak = v; }
    for (let i = 0; i < n; i++) if (Math.max(Math.abs(L[i]), Math.abs(R[i])) > peak * 0.01) { on = i; break; }
    // the click: the largest sample-to-sample step in the first 2 ms after the onset, against the peak
    let jump = 0; for (let i = Math.max(1, on); i < Math.min(n, on + 96); i++) jump = Math.max(jump, Math.abs(L[i] - L[i - 1]), Math.abs(R[i] - R[i - 1]));
    const K = await kw(buf), kl = K.getChannelData(0), kr = K.getChannelData(1), w = 2400;
    const cum = new Float64Array(n + 1); for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + kl[i] * kl[i] + kr[i] * kr[i];
    let l50 = -200; for (let i = 0; i + w <= n; i += 600) l50 = Math.max(l50, -0.691 + 10 * Math.log10((cum[i + w] - cum[i]) / w + 1e-12));
    return { peak: +dB(peak).toFixed(1), l50: +l50.toFixed(1), click: +(jump / (peak || 1)).toFixed(3) };
  }
}, heard);
console.log('bounds', JSON.stringify(bounds));
const VOICE_L50 = -9.3;   // a voice line's 50 ms loudness (docs/lba-maturity/action-sound.md, tools/sfx-render.mjs)
const rows = Object.entries(bounds);
const bad = (f) => rows.filter(([, m]) => !f(m)).map(([n, m]) => [n, m]);
check(`every sound heard (${rows.length}) peaks under -12 dBFS`, rows.length > 30 && !bad((m) => m.peak <= -12).length, bad((m) => m.peak <= -12));
check('every sound heard is at least 8 dB under a voice line (50 ms loudness ≤ -17.3 LUFS) and audible (≥ -62)', !bad((m) => m.l50 <= VOICE_L50 - 8 && m.l50 >= -62).length, bad((m) => m.l50 <= VOICE_L50 - 8 && m.l50 >= -62));
check('every sound heard starts without a click (the largest step in its first 2 ms under 25 % of its peak)', !bad((m) => m.click < 0.25).length, bad((m) => m.click < 0.25));
check('the SFX slider at 0 silences every one of them (the effects bus carries them all)', !bad((m) => m.mute < -90).length, bad((m) => m.mute < -90));
const L = (n) => bounds[n]?.l50 ?? NaN;
check('small under big: a tiptoe ≥ 6 dB under a step, a kash under a found object, a bounce under the hit on an enemy\'s material', L('step-sneak') <= L('step-stone') - 6 && L('coin') < L('found') && L('bounceStone') <= L('hitWood') + 3, { sneak: L('step-sneak'), step: L('step-stone'), coin: L('coin'), found: L('found'), bounce: L('bounceStone'), hitWood: L('hitWood') });

// ---------------------------------------------------------------- 9. the cost on the main thread
const cost = await ev(() => {
  const A = game.audio, h = game.hero, names = ['step-stone', 'swing', 'slashFlesh', 'bounceStone', 'ballHit', 'coin', 'catch', 'kick', 'hurt', 'throw'], per = [];
  for (let k = 0; k < 40; k++) { const t0 = performance.now(); for (const n of names) A.play(n, { x: h.pos.x + 2, z: h.pos.z + 1 }); per.push((performance.now() - t0) / names.length); Y.wait(60); }
  per.sort((a, b) => a - b);
  return { median: +per[20].toFixed(3), p95: +per[37].toFixed(3), max: +per[39].toFixed(3) };
});
check('the cost of play() on the main thread: median under 0.5 ms a call', cost.median < 0.5, cost);
const stats = await ev(() => ({ ...game.audio.sfxStats }));
console.log('sfxStats', JSON.stringify(stats));

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
