// Chapters 11 and 12 (The Shell, The Core) and the epilogue playthrough: jump to the end of chapter 2 → the shaft →
// the deep installation (diagram, ball switch, valves A and C) → the crystal galleries (three pillars, the stones) →
// Sendell (end of chapter 11; the door to the core starts chapter 12, with its card) → the core (three pylons while
// the guardian fights) → epilogue dinner → end screen → free roam.
// Ball targets are first tried with a real throw; if a throw misses, the hit is applied directly and the
// log says "forced" (aiming is covered by the earlier tests; this one checks the story can be finished).
// Also: a save taken mid-chapter (after the galleries) reloads with the progress intact.
// CAMPAIGN-9 (wave 7, story/answer.js): the crew's test receiver in the shaft (a bank shot from its plate); in the machinery the
// steam over the catwalk, the damper's answer (two after the shell's three) and the east end gone quiet, the fitters' knocker
// (three answered with two, two with four slow: the west end quiet); the shutter held by her crystal; the third heart from
// the middle stone's plate off the survey mirror; the arch shut behind him and Sendell's words; after the coil the last act:
// the branch cock (kicked back in a knock, turned in the rest), Irsa, Vesk's key, the lock's bar after her two, two knocks.
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
      press(c) { G.input.keys.add(c); G.input.taps.add(c); G.step(1 / 60); G.input.keys.delete(c); G.step(1 / 30); },
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
await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });
// finish chapter 2 by its own ending call (chapter 2 has its own test)
await ev(() => { const G = game; Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_mills: true, c2_signal: true });
  G.story.cur.toShell?.(); G.step(1.5); T.talkAll(); G.step(0.5); T.talkAll();
  // chapters between Zeelich and the shell (Desert Island, …) have their own tests: skip to the shell
  for (let i = 0; i < 12 && G.story.cur.key !== 'shell'; i++) { G.story.nextChapter(); G.step(0.5); T.talkAll(); } });
is('chapter 11 (shell) starts in the shaft, in play, an objective set', await ev(() => [game.flags.chapter, game.flags.c3_started, game.room?.id, game.state, T.obj()]), (v) => v[0] === 10 && v[1] === true && v[2] === 'c3shaft' && v[3] === 'play' && v[4].length > 0);
await shot('C3-00-shaft.png');
// SHAFT-CITADEL: the shaft's top is the bore in Citadel's station, not Zeelich's platform: the lift comes up in the station's
// yard beside the collar (the blast doors open since the network's code), and the collar takes him back down
is('up the lift: out in the station\'s yard on Citadel, beside the bore\'s collar, the blast doors open', await ev(() => { const r = T.exit('c3-up'); const st = game.world.station, h = game.hero; return [r, game.room?.id ?? null, +Math.hypot(h.pos.x - st.bore.x, h.pos.z - st.bore.z).toFixed(1), !!st.sealed, game.findInteractable()?.kind, game.state]; }),
  (v) => v[1] === null && v[2] < 5.5 && v[3] === false && v[4] === 'c3down' && v[5] === 'play');
is('the collar takes him back down the shaft', await ev(() => { T.tap('KeyE'); game.step(1.6); T.talkAll(); return [game.room?.id, game.flags.chapterKey]; }), (v) => v[0] === 'c3shaft' && v[1] === 'shell');

// CAMPAIGN-9: the crew's test receiver, from its plate (standing still lines him up), off the panel
is('the shaft: the crew\'s test receiver hit by a bank shot from its plate (Baldino says so)', await ev(() => { const G = game, S = G.room.teach, h = G.hero; T.tp(S.plate.x, S.plate.z, 0); h.hp = h.maxHp; G.step(0.8); const a = h.angle;
  G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(2.0); T.talkAll(); return { a: +a.toFixed(2), lit: S.lit, bank: G.flags.sh_bank }; }), (v) => Math.abs(v.a - Math.PI / 2) < 0.05 && v.lit && v.bank === true);
// the deep installation
is('down to the deep installation', await ev(() => T.exit('c3-deep')), (v) => v === 'c3deep');
is('the machinery: steam out of all four vents over the catwalk; near the stair the damper answers the shell\'s three with two, the east end goes quiet', await ev(() => {
  const G = game, D = G.room, f = G.flags; const st = D.vents.map((v) => v.latched).join(); T.tp(D.ladder.x, D.ladder.z + 0.5, Math.PI);
  for (let i = 0; i < 400 && !f.sh_knock; i++) { G.step(0.1); if (G.state === 'dialog') T.talkAll(); } T.talkAll(); return [st, f.sh_knock, D.vents.map((v) => v.latched).join()]; }),
  (v) => v[0] === 'false,false,false,false' && v[1] === true && v[2] === 'false,false,true,true');
await shot('C3-01-deep.png');
is('the cooling diagram read', await ev(() => { const D = game.room; T.useAt(D.diagram.x, D.diagram.z); return [game.flags.c3_diagram, T.obj()]; }), (v) => v[0] === true && v[1].length > 0);
is('the wrong valve (B) opens but cools nothing', await ev(() => { const v = game.room.valves.find((x) => x.id === 'B'); T.useAt(v.x, v.z, v.y); return [v.open, game.flags.c3_cooled]; }), (v) => v[0] === true && !v[1]);
await ev(() => { const v = game.room.valves.find((x) => x.id === 'B'); T.useAt(v.x, v.z, v.y); });
is('valve A opened (not cooled yet)', await ev(() => { const v = game.room.valves.find((x) => x.id === 'A'); T.useAt(v.x, v.z, v.y); return [v.open, game.flags.c3_cooled]; }), (v) => v[0] === true && !v[1]);
is("the ladder's ball switch hit, the ladder down", await ev(() => { const tg = game.room.ballTargets.find((x) => x.ballSwitch); return [T.hit(tg), game.flags.c3_ladder]; }), (v) => v[0] !== 'FAILED' && v[1] === true);
is('on the catwalk, a step into the west end\'s steam burns and pushes him back', await ev(() => { const G = game, D = G.room, h = G.hero, W = D.vents[1]; T.tp(W.x + 0.9, W.z, -Math.PI / 2, 3.0); h.hp = h.maxHp; h.invuln = 0; const hp = h.hp;
  for (let i = 0; i < 30; i++) { G.input.keys.add('ArrowUp'); G.step(1 / 30); } G.input.keys.delete('ArrowUp'); G.step(0.6); T.talkAll(); return [hp - h.hp, +h.pos.y.toFixed(1)]; }), (v) => v[0] >= 1 && v[1] === 3);
is('the knocker: three knocks are answered with two (nothing changes); two knocks: four slow, the west end goes quiet', await ev(() => {
  const G = game, D = G.room, K = D.knocker, f = G.flags, h = G.hero, sh = G.story._sh;
  const knock = (n) => { T.tp(K.x - 0.38, K.z + 0.55, Math.PI, 3.0); for (let i = 0; i < n; i++) { for (let w = 0; w < 60 && h.actT > 0; w++) G.step(0.05); T.tap('KeyE'); for (let w = 0; w < 40 && (h.steer || h.actT > 0); w++) G.step(0.05); } for (let i = 0; i < 200 && (sh.msg || sh.busy || G.state === 'dialog'); i++) { G.step(0.1); if (G.state === 'dialog') T.talkAll(); } T.talkAll(); };
  knock(3); const a = [f.sh_reply ?? null, D.vents.map((v) => v.latched).join()]; knock(2); return [...a, f.sh_reply, D.vents.map((v) => v.latched).join()]; }),
  (v) => v[0] === null && v[1] === 'false,false,true,true' && v[2] === true && v[3] === 'true,true,true,true');
is('valve C on the catwalk: cooled', await ev(() => { const v = game.room.valves.find((x) => x.id === 'C'); T.useAt(v.x, v.z, v.y); return [v.open, game.flags.c3_cooled, game.hero.pos.y.toFixed(2), v.y]; }), (v) => v[0] === true && v[1] === true);
is('the machinery cooled, an objective set', await ev(() => [game.flags.c3_cooled, T.obj()]), (v) => v[0] === true && v[1].length > 0);
await shot('C3-02-cooled.png');

// the galleries (CAMPAIGN-9: the shutter starts down as he reaches it; her crystal holds it)
is('at the shutter: it comes down and her crystal holds it open; on to the crystal galleries (still in the doorway once the line is read)', await ev(() => { let r = T.exit('c3-gallery'); const held = !!game.flags.sh_held; for (let i = 0; i < 60 && game.room?.id !== 'c3gallery'; i++) { game.step(0.1); T.talkAll(); } return [held, game.room?.id]; }), (v) => v[0] && v[1] === 'c3gallery');
await shot('C3-03-gallery.png');
is('the first two pillars hit', await ev(() => game.room.ballTargets.filter((x) => x.pillar != null && !x.node).map((tg) => T.hit(tg))), (v) => v.length === 2 && v.every((x) => x !== 'FAILED'));
is('the third heart faces the far side: from the middle stone\'s plate (it lines him up), the throw comes off the survey mirror onto it', await ev(() => { const G = game, R = G.room, S = R.stonePlate, h = G.hero, tg = R.ballTargets.find((x) => x.pillar === 2);
  G.step(2); T.talkAll(); T.tp(S.x + 0.15, S.z - 0.1, 0, 3.0); h.hp = h.maxHp; G.step(0.8); T.talkAll(); G.step(0.6); const a = h.angle; G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(2.0); T.talkAll(); return { a: +a.toFixed(2), up: S.up(), done: tg.done, node: !!tg.node }; }), (v) => v.up && v.node && Math.abs(v.a - Math.PI / 2) < 0.05 && v.done);
is('the stones raised, an objective set', await ev(() => [game.flags.c3_pillar0, game.flags.c3_pillar1, game.flags.c3_pillar2, T.obj()]), (v) => v[0] && v[1] && v[2] && v[3].length > 0);
await shot('C3-04-stones.png');

// mid-chapter save → reload → Continue
const before = await ev(() => { game.save(false); return JSON.stringify(['c3_cooled', 'c3_ladder', 'c3_pillar0', 'c3_pillar1', 'c3_pillar2'].map((k) => !!game.flags[k])); });
await boot('continue');
const after = await ev(() => { T.talkAll(); return JSON.stringify(['c3_cooled', 'c3_ladder', 'c3_pillar0', 'c3_pillar1', 'c3_pillar2'].map((k) => !!game.flags[k])); });
is('save → Continue: the chapter-11 progress survives, back in the galleries', [before === after, after, ...await ev(() => [game.room?.id, game.flags.chapter, T.obj()])], (v) => v[0] && v[2] === 'c3gallery' && v[3] === 10);

// Sendell
is('on to Sendell', await ev(() => { if (game.room?.id !== 'c3gallery') T.exit('c3-gallery'); return T.exit('c3-sendell'); }), (v) => v === 'c3sendell');
is("the arch he came in by grows shut behind him first; then Sendell's words (why), the checkpoint, the core objective", await ev(() => { for (let i = 0; i < 40 && !game.flags.c3_sendell; i++) { game.step(0.1); T.talkAll(); } T.talkAll(); return [game.flags.sh_shut, !!game.room.seal?.shut, game.flags.c3_sendell, game.hero.hp === game.hero.maxHp, T.obj()]; }), (v) => v[0] === true && v[1] && v[2] === true && v[3] && v[4].length > 0);
is('the way back is shut (her crystal across the arch)', await ev(() => { T.exit('c3-gallery'); T.talkAll(); return game.room?.id; }), (v) => v === 'c3sendell');
await shot('C3-05-sendell.png');

// the core: Vesk, the guardian, the pylons
// the door from Sendell's chamber: chapter 11 ends, chapter 12's card shows, then Vesk's scene and the fight
is("Sendell's door: chapter 12 (The Core) begins under its own title card, in the core room", await ev(() => {
  const j0 = game.story.journal().map((c) => c.title);
  const e = game.room.exits.find((x) => x.to === 'c3-core'); T.tp(e.x, e.z, 0, e.y ?? Math.max(game.hero.pos.y, game.room.deckY ?? -1e9) + 0.5);
  let card = null; for (let i = 0; i < 60 && game.flags.chapterKey !== 'core'; i++) game.step(0.1);
  game.step(0.3); const el = document.querySelector('#chapter'); card = el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  return { j0, key: game.flags.chapterKey, chapter: game.flags.chapter, card, room: game.room?.id, state: game.state }; }),
  (v) => v.key === 'core' && v.chapter === 11 && /Chapter 12/.test(v.card) && /The Core/.test(v.card) && v.room === 'c3core' && v.j0.includes('11. The Shell') && !v.j0.includes('12. The Core'));
is('in the core: the fight starts, an objective set', await ev(() => { T.talkAll(); return [game.room?.id, game.flags.c3_fight, T.obj()]; }), (v) => v[0] === 'c3core' && v[1] === true && v[2].length > 0);
is('the journal keeps both chapters: 11 The Shell (its four lines and the thread\'s three: the answer, the held shutter, the shut arch) and 12 The Core (its first line only, the fight begun; the pylons are still the objective)', await ev(() => game.story.journal().filter((c) => /Shell|Core/.test(c.title)).map((c) => [c.title, c.lines.length])), (v) => v.length === 2 && v[0][0] === '11. The Shell' && v[0][1] === 7 && v[1][0] === '12. The Core' && v[1][1] === 1);
is('the guardian is there and alive', await ev(() => { const g = game.story.cur.guardian; return g ? [g.present, g.state, g.alive] : 'none'; }), (v) => Array.isArray(v) && v[0] === true && v[2] === true);
is("the core can't be left during the fight", await ev(() => { const e = game.room.exits[0]; T.tp(e.x, e.z); game.step(1.6); T.talkAll(); return game.room?.id; }), (v) => v === 'c3core');
await shot('C3-06-core.png');
// bank shots: walk onto each pylon's glowing plate (it lines Twinsen up), throw in normal behaviour
// (each plate's own spot: a real throw from its centre, in the plate's heading, must reach its pylon the first time — the third
//  plate once sat 0.5 m too far left, and its shot struck the bay's shield wall, so the final fight could not be won from the plates)
const plateShots = await ev(() => game.story.cur.plates().map((p) => {
  const G = game, h = G.hero, tg = G.room.ballTargets.find((x) => x.pylon === p.i);
  let first = null;
  for (let k = 0; k < 3 && !tg.done; k++) {
    T.tp(k === 0 ? p.x : p.x + 0.3, k === 0 ? p.z : p.z - 0.2, 0); h.hp = h.maxHp; G.step(0.6); // stand still: the plate centres and turns him
    G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(1.6); T.talkAll();
    if (k === 0) first = !!tg.done;
  }
  return { first, last: tg.done ? 'bank shot' : T.hit(tg) };
}));
is('the three pylons converted', plateShots.map((x) => x.last), (v) => v.length === 3 && v.every((x) => x !== 'FAILED'));
is("each plate's first bank shot, thrown from its centre, hits its pylon", plateShots.map((x) => x.first), (v) => v.length === 3 && v.every((x) => x === true));
// CHAPTER-BALANCE: the overload first needs the bore's bleed valve on the deck ring; no coil until it is turned
is('the overload: no coil yet, the objective names the bleed valve', await ev(() => { T.talkAll(); game.step(1); T.talkAll(); const tg = game.room.ballTargets.find((x) => x.coil); return [game.flags.c3_overload, !!tg, T.obj(), !!game.room.bleed]; }), (v) => v[0] === true && v[1] === false && /bleed/i.test(v[2]) && v[3]);
// BOSS-SHAPE: the overloaded guardian dives (a ring on the deck follows him as it climbs, stops, it drops onto it), then sits
// stuck in the deck. Twinsen placed between the arena's middle and the bleed valve (ISO), the dive's turn set (ISO); the
// answers by input: stand still (hit), walk out once the ring stops (just clear), the dodge (clear), a ball at the climb
// (knocked out of the dive)
await ev(() => { const G = game, C = G.room, gd = G.story.cur.guardian, A = gd.arena, cx = (A.x0 + A.x1) / 2, cz = (A.z0 + A.z1) / 2;
  window.DV = { sx: cx + (C.bleed.x - cx) * 0.55, sz: cz + (C.bleed.z - cz) * 0.55,
    run(how) {
      const h = G.hero, keys = G.input.keys;
      const put = () => { h.pos.set(DV.sx, G.physics.groundAt(DV.sx, DV.sz, h.pos.y + 2), DV.sz); h.angle = Math.atan2(cx - DV.sx, cz - DV.sz); h.vel?.set?.(0, 0); };
      for (let i = 0; i < 300 && (G.state !== 'play' || h.actT > 0 || gd.state === 'ground' || gd.diving); i++) { G.step(1 / 30); if (G.state !== 'play') T.talkAll(); }
      put(); h.hp = h.maxHp; h.invuln = 0; G.ball.state = 'idle';
      gd.nextDive = true; if (gd.state !== 'stunned') { gd.state = 'chase'; gd.coolT = 0; }
      let t = 0; for (; t < 12 && gd.state !== 'rise'; t += 1 / 60) { G.step(1 / 60); h.pos.x = DV.sx; h.pos.z = DV.sz; }
      const r = { how, rose: gd.state === 'rise', hp0: h.hp };
      if (how === 'ball') { G.step(0.3); h.angle = h.angleTo(gd); T.tap('KeyF'); G.step(1.0); r.after = gd.state; return r; }
      G.step(0.5); h.pos.x += 0.8;   // (ISO: a step aside while it climbs: the ring must lock where he is now)
      for (let i = 0; i < 120 && gd.state === 'rise'; i++) G.step(1 / 60);
      const s = gd.spot; r.lockedOnHim = !!s && Math.hypot(s.x - h.pos.x, s.z - h.pos.z) < 0.2;
      if (how === 'walk') keys.add('ArrowUp');
      if (how === 'dodge') T.tap('KeyX');
      for (let i = 0; i < 180 && (gd.state === 'lock' || gd.state === 'drop'); i++) G.step(1 / 60);
      keys.delete('ArrowUp');
      r.lost = r.hp0 - h.hp; r.knocked = h.rig.anim === 'knockdown'; r.out = +Math.hypot(h.pos.x - s.x, h.pos.z - s.z).toFixed(2);
      const nb = G.bolts.list.length; let tg = 0; for (; tg < 6 && gd.state === 'ground'; tg += 1 / 60) G.step(1 / 60);
      r.stuck = +tg.toFixed(2); r.fired = G.bolts.list.length - nb;
      return r;
    } }; });
const dvGlance = await ev(() => { const G = game, h = G.hero, gd = G.story.cur.guardian;
  for (let i = 0; i < 300 && (G.state !== 'play' || gd.state !== 'chase'); i++) { G.step(1 / 30); if (G.state !== 'play') T.talkAll(); }
  gd.coolT = 9; h.pos.set(DV.sx, G.physics.groundAt(DV.sx, DV.sz, h.pos.y + 2), DV.sz); h.hp = h.maxHp; G.ball.state = 'idle'; G.step(0.3);
  h.angle = h.angleTo(gd); const s0 = gd.state; T.tap('KeyF'); let st = []; for (let i = 0; i < 60; i++) { G.step(1 / 60); st.push(gd.state); }
  gd.coolT = 0; return { s0, stunned: st.includes('stunned') }; });
is('overloaded, a ball at it while it hovers glances off (no stun): the dive is the way in', dvGlance, (v) => v.s0 === 'chase' && !v.stunned);
const dvStand = await ev(() => DV.run('stand'));
is('the overloaded guardian dives: its ring follows him and locks where he is; standing in it costs 2 and knocks him down; then it is stuck in the deck ~3 s and fires nothing', dvStand, (v) => v.rose && v.lockedOnHim && v.lost === 2 && v.knocked && v.stuck > 2.8 && v.fired === 0);
const dvWalk = await ev(() => DV.run('walk'));
is('walking straight out once the ring stops (input): just clear, no harm', dvWalk, (v) => v.rose && v.lost === 0 && v.out >= 2.0);
const dvDodge = await ev(() => DV.run('dodge'));
is('the dodge (X) once the ring stops: clear, no harm', dvDodge, (v) => v.rose && v.lost === 0);
const dvBall = await ev(() => DV.run('ball'));
is('a ball at it while it climbs knocks it out of the dive (stunned)', dvBall, (v) => v.rose && v.after === 'stunned');
is('the bleed valve turned (its prompt, E): Ilka takes the surge, Vesk raises the coil, an objective set', await ev(() => { const G = game, B = G.room.bleed, h = G.hero; T.tp(B.x, B.z); const g = G.story.cur.guardian; if (g) { g.state = 'stunned'; g.stateT = 0; } h.hp = h.maxHp; G.step(0.2); T.tap('KeyE'); G.step(1.6); T.talkAll(); G.step(0.5); T.talkAll(); const tg = G.room.ballTargets.find((x) => x.coil); return { bleed: G.flags.c3_bleed, open: B.open, coil: !!tg, obj: T.obj() }; }), (v) => v.bleed === true && v.open && v.coil && /coil/i.test(v.obj));
// Vesk's coil: three hits (real throws first, T.hit forces a hit only if the throws miss)
is("Vesk's coil broken", await ev(() => { const tg = game.room.ballTargets.find((x) => x.coil); const r = []; for (let k = 0; tg && k < 3 && !tg.done; k++) r.push(T.hit(tg)); T.talkAll(); return [tg ? r : 'no coil', game.flags.c3_coil, tg?.done]; }), (v) => v[1] && v[2] === true);
// CAMPAIGN-9: the last act (after Vesk's choice, taken with E by talkAll): the branch cock, Irsa, Vesk's key, the lock, the signal
is('the last act begins: the objective names Mill Lane\'s branch, the guardian is gone', await ev(() => { T.talkAll(); game.step(1); T.talkAll(); return [game.flags.c3_turned, game.flags.co_go, /Mill Lane/.test(T.obj()), !!game.story.cur.guardian?.present]; }), (v) => v[0] === true && v[1] === true && v[2] && !v[3]);
// (put at the handle's front, facing it, then E — held for a frame, as a key press — when the knocking's clock is in [lo, hi):
//  the hand meets the handle about half a second after the press)
const turnAt = async (kind, sel, lo, hi) => ev(([kind, sel, lo, hi]) => { const G = game, sh = G.story._sh, h = G.hero, p = new Function('return ' + sel)(); T.talkAll(); T.tp(p.x - Math.sin(p.a) * 0.55 + Math.cos(p.a) * 0.38, p.z - Math.cos(p.a) * 0.55 - Math.sin(p.a) * 0.38, p.a); G.step(0.3);
  for (let w = 0; w < 400 && !(sh.phase() > lo && sh.phase() < hi); w++) G.step(1 / 60); T.press('KeyE'); for (let w = 0; w < 60 && (h.steer || h.actT > 0); w++) G.step(0.05); for (let i = 0; i < 300 && (sh.busy || G.state === 'dialog'); i++) { G.step(0.1); if (G.state === 'dialog') T.talkAll(); } T.talkAll(); return G.flags; }, [kind, sel, lo, hi]);
is('the cock turned in a knock kicks back', await turnAt('co_cock', 'game.room.branch', 3.4, 3.5).then((f) => f.co_branch ?? null), (v) => v === null);
is('the cock turned in the rest: Mill Lane on the mills, Irsa holding, Vesk walks to his lock and turns his own key', await turnAt('co_cock', 'game.room.branch', 1.7, 2.1).then(async (f) => { await ev(() => { for (let i = 0; i < 400 && !game.flags.co_vesk; i++) { game.step(0.1); if (game.state === 'dialog') T.talkAll(); } T.talkAll(); }); return ev(() => [game.flags.co_branch, game.flags.co_irsa, game.flags.co_vesk, game.room.lock.turned]); }), (v) => v[0] === true && v[1] === true && v[2] === true && v[3]);
is('the lock\'s bar lifted in the gap before her two is slammed back; lifted after them it stays up, the drill winds down', await turnAt('co_lock', 'game.room.lock.grip', 0.3, 0.4).then(async (f) => { const a = f.co_lock ?? null; const g = await turnAt('co_lock', 'game.room.lock.grip', 1.4, 1.6); await ev(() => game.step(3)); return [a, g.co_lock, await ev(() => +game.room.drill.spin.toFixed(2))]; }), (v) => v[0] === null && v[1] === true && v[2] < 0.1);
is('two knocks on the main: the signal, the shield, the guard; the chapter ends', await ev(() => { const G = game, K = G.room.coreKnocker, h = G.hero; T.talkAll(); T.tp(K.x - Math.sin(K.a) * 0.55 + Math.cos(K.a) * 0.38, K.z - Math.cos(K.a) * 0.55 - Math.sin(K.a) * 0.38, K.a); G.step(0.3);
  for (let i = 0; i < 2; i++) { for (let w = 0; w < 60 && h.actT > 0; w++) G.step(0.05); T.press('KeyE'); for (let w = 0; w < 40 && (h.steer || h.actT > 0); w++) G.step(0.05); }
  for (let i = 0; i < 400 && G.flags.chapterKey === 'core'; i++) { G.step(0.1); if (G.state === 'dialog') T.talkAll(); } return [G.flags.co_signal, G.flags.c3_done, G.flags.chapterKey]; }), (v) => v[0] === true && v[1] === true && v[2] === 'home');
is('the chapter ends: the epilogue (after chapter 12, home) reached', await ev(() => { T.talkAll(); game.step(2); T.talkAll(); return [game.flags.c3_turned, game.flags.c3_done, game.flags.chapter, game.room?.id, game.state, game.flags.chapterKey]; }), (v) => v[0] === true && v[1] === true && v[2] === 12 && v[5] === 'home');

// epilogue: dinner → end screen
is("the epilogue's dinner, then the end screen", await ev(() => { const G = game; for (let i = 0; i < 10 && G.state !== 'ending'; i++) { G.step(0.5); if (G.state === 'dialog') T.talkAll(); } return [G.flags.chapter, G.flags.ep_dinner, G.state, document.querySelector('#ending h1')?.textContent]; }), (v) => v[1] === true && v[2] === 'ending');
await shot('C3-07-end.png');
const buttons = await ev(() => [...document.querySelectorAll('#ending button')].filter((b) => b.offsetParent).map((b) => b.textContent.trim()));
is('the end screen offers buttons (Keep Exploring)', buttons, (v) => v.length >= 2);
// keep exploring
is('Keep Exploring: in play, free roam, an objective set', await ev(() => { const b = [...document.querySelectorAll('#ending button')].find((x) => x.offsetParent && /explor/i.test(x.textContent)); b?.click(); game.step(0.5); T.talkAll(); return [game.state, game.flags.ep_free, T.obj()]; /* (EQUIP-2a: Arthur's one call-out at home, heard out) */ }), (v) => v[0] === 'play' && v[1] === true && v[2].length > 0);
is('free roam: talking to Gilbert ends back in play', await ev(() => { if (game.room) { const e = game.room.exits[0]; T.tp(e.x, e.z); game.step(1.6); T.talkAll(); } T.talk('gilbert'); return game.state; }), (v) => v === 'play');

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
