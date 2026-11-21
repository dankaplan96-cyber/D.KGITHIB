// PUZZLES (P80, docs/lba-maturity/PUZZLES.md): the puzzles changed by the puzzle pass, one section each.
//   c5  chapter 5, FunFrock's condenser hall (story/steam.js, condenser.js): the diagram shows where each branch goes,
//       not how to set it; each gauge sits over the branch it reads; steam let in with nowhere to go shakes the shut
//       branches and flutters their needles; one branch open settles its own needle (progress); the aquifer branch
//       opened with steam on sends its needle into the red; a save halfway keeps the valves and the shaking.
//   c15 chapter 15, the cooling machinery (story/chapter3.js, underground.js; phase 2): one pump feeds the drill's drive
//       and the exchanger; the drain (B) is found open; both feeds with it running starve the drive (it slows, its lamp
//       red, his line); shut, the loop closes and the exchanger cools with the drive at speed; a save halfway keeps it.
//   c7  chapter 7, the vent's seal (story/observatory.js, hamalayi.js): three of the five discs steam already, two are
//       capped with ice; a ball at a steaming one only rings (said once); the ice broken (ball, or a blow) lets that
//       one breathe; with all five breathing the seal turns; a save halfway keeps what was freed.
// Staged: the story's own flags jump to the chapter (as tests/chapter5.mjs and chapter7.mjs do); in the puzzle the hero
// walks, uses and throws by input (tests/lib/player.js). BEFORE=1 only takes the "before" pictures (the old build).
// Run: GAME_URL=http://localhost:<port>/ [PART=c5,c7] [BEFORE=1] node tests/puzzles.mjs
import { launch, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const OUT = fileURLToPath(new URL('../captures/puzzles/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const BEFORE = !!process.env.BEFORE;
const PARTS = (process.env.PART || 'c5,c7').split(',');
const { browser, page } = await launch({ width: 1280, height: 720 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { if (BEFORE) { console.log('(before) ' + label, JSON.stringify(v)); return v; } check(label, !!ok(v), v); return v; };
const shot = async (n) => { await ev(() => { game.step(0.05); game.renderer.render(); }); await page.screenshot({ path: OUT + (BEFORE ? 'before-' : 'after-') + n + '.jpg', type: 'jpeg', quality: 82, timeout: 180000 }); };
const boot = async (mode) => {
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  await page.evaluate(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  if (mode === 'new' && await page.isVisible('#confirmnew [data-act="newyes"]')) await page.click('#confirmnew [data-act="newyes"]', { timeout: 60000 });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => {
    const G = window.game; G.testFreeze = true;
    const said = (window.SAID = []), toasts = (window.TOASTS = []);
    const say0 = G.say.bind(G), toast0 = G.hud.toast.bind(G.hud);
    G.say = (name, lines, ...rest) => { said.push([].concat(lines).join(' ')); return say0(name, lines, ...rest); };
    G.hud.toast = (k, ...rest) => { toasts.push(k); return toast0(k, ...rest); };
    window.T = {
      tap(c) { G.input.taps.add(c); G.step(1 / 60); },
      talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0, y = null) { const h = G.hero; h.pos.set(x, y == null ? G.physics.groundAt(x, z) : G.physics.groundAt(x, z, y + 1), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); },
      npc(id) { return G.npcs.find((n) => n.def.id === id); },
      talk(id) { const n = T.npc(id); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05); T.talkAll(); },
      useAt(x, z, y = null) { T.tp(x + 0.9, z + 0.3, 0, y); G.hero.angle = Math.atan2(x - G.hero.pos.x, z - G.hero.pos.z); G.step(0.3); T.tap('KeyE'); G.step(1.6); T.talkAll(); },
      obj() { G.updateObjective(); return document.querySelector('#pause-objective')?.textContent || ''; },
      said(from) { return window.SAID.slice(from); },
      calm() { for (const e of G.enemies) if (e.alive && e.group === G.room?.id) { e.state = 'idle'; } G.hero.hp = G.hero.maxHp; },
    };
  });
};

// ================================================================ c5: the condenser hall
if (PARTS.includes('c5')) {
  await boot('new');
  is('c5: chapter 5 at Kesh', await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 3, chapterKey: 'dig', c4_started: true, c4_done: true, c4_pump: true, c4_trust: true, c4_carving: true,
    dt_v: 1, dt_hail: true, dt_cut: true, dt_second: true, dt_again: true, dt_strip: true });
    G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle(); P.settle(); return [G.flags.chapterKey, G.room?.id, G.state]; }), (v) => v[0] === 'steam' && v[1] === 'desert' && v[2] === 'play');
  is('c5: the jar, the oasis, the shovel, the door dug out, into the hall', await ev(() => { const G = game, D = G.rooms.desert; T.talk('dtrader'); T.useAt(D.oasisEdge.x, D.oasisEdge.z); T.talk('dtrader');
    T.useAt(D.ruins.door.x, D.ruins.door.z + 1.2); G.step(1.5); T.talkAll(); T.tp(D.ruins.door.x, D.ruins.door.z + 1.6); G.step(0.3); T.tp(D.ruins.door.x, D.ruins.door.z); G.step(1.6); T.talkAll();
    // FunFrock's trooper and drones put out of the way (the fight is not this test's)
    for (const e of G.enemies) if (e.alive && e.group === 'condA') { for (let k = 0; k < 12 && e.alive; k++) { (e.take || e.damage).call(e, 3, G.hero.pos); G.step(0.1); } }
    G.step(2.6); T.talkAll(); return [G.room?.id, G.enemies.filter((e) => e.alive && e.group === 'condA').length]; }), (v) => v[0] === 'condA');
  const n0 = await ev(() => window.SAID.length);
  is('c5: the diagram (input): where each branch goes, not how to set it', await ev(() => { const A = game.rooms.condA; P.use(A.diagram.x, A.diagram.z, { kind: 'c5diagram' }); P.settle(); return T.said(0).slice(-1)[0] || ''; }),
    (v) => /aquifer/i.test(v) && /condenser/i.test(v) && !/\bopen\b|\bshut\b/i.test(v));
  void n0;
  if (BEFORE) {
    await ev(() => { const A = game.rooms.condA, v = A.valves.find((x) => x.id === 1); P.use(v.x, v.z, { near: 1.0, kind: 'c5valve' }); game.step(0.6); P.settle();
      const w = A.valves.find((x) => x.id === 3); P.go(w.x + 0.6, w.z + 2.4, { tol: 0.4 }); P.face(w.x, w.z - 2); game.step(0.4); });
    await shot('c5-valve1-pressure');
  }
  if (!BEFORE) {
  const valve = (id, opts = {}) => ev(([id, opts]) => { const A = game.rooms.condA, v = A.valves.find((x) => x.id === id), n = window.SAID.length; P.use(v.x, v.z, { near: 1.0, kind: 'c5valve' }); game.step(0.6); if (!opts.keep) P.settle(); return { open: v.open, said: T.said(n), toasts: window.TOASTS.slice(-1) }; }, [id, opts]);
  const gauges = () => ev(() => { const A = game.rooms.condA; return A.gauges.read(); });
  is('c5: valve 2 first, with no steam in: no aquifer line, its needle still', await valve(2), (v) => v.open && !v.said.some((s) => /aquifer/i.test(s)));
  is('c5: the aquifer gauge (over valve 2) at rest', await gauges(), (v) => v.vals[0] < 0.05 && !v.flutter[0]);
  is('c5: valve 2 shut again', await valve(2), (v) => !v.open);
  is('c5: valve 1 (the bore): steam in with nowhere to go: his line says so', await valve(1), (v) => v.open && v.said.some((s) => /nowhere to go/i.test(s)));
  is('c5: both condenser gauges (over 3 and 4) in the red and fluttering; the aquifer\'s at rest', await gauges(), (v) => v.vals[1] > 0.85 && v.vals[2] > 0.85 && v.flutter[1] && v.flutter[2] && !v.flutter[0]);
  is('c5: the shut branches 3 and 4 shudder', await ev(() => game.rooms.condA.valves.map((x) => !!x.shaking)), (v) => !v[0] && !v[1] && v[2] && v[3]);
  await ev(() => { const A = game.rooms.condA, v = A.valves.find((x) => x.id === 3); P.go(v.x + 0.6, v.z + 2.4, { tol: 0.4 }); P.face(v.x, v.z - 2); game.step(0.4); });
  await shot('c5-valve1-pressure');
  is('c5: valve 3: its needle settles in the green, steady; 4 still in the red; not routed yet', await ev(() => { const A = game.rooms.condA, v = A.valves.find((x) => x.id === 3); P.use(v.x, v.z, { near: 1.0, kind: 'c5valve' }); game.step(0.6); P.settle();
    const g = A.gauges.read(); return { g, routed: !!game.flags.c5_routed, shaking: A.valves.map((x) => !!x.shaking) }; }), (v) => v.g.vals[1] < 0.5 && !v.g.flutter[1] && v.g.vals[2] > 0.85 && v.g.flutter[2] && !v.routed && v.shaking[3] && !v.shaking[2]);
  is('c5: a wrong try: valve 2 with the steam on: the aquifer needle in the red, his line; not routed', await valve(2), (v) => v.open && v.said.some((s) => /aquifer/i.test(s)));
  is('c5: (the aquifer gauge reads it)', await gauges(), (v) => v.vals[0] > 0.85 && v.flutter[0]);
  is('c5: valve 2 shut again', await valve(2), (v) => !v.open);
  // save halfway (1 and 3 open), Continue
  await ev(() => { game.save(false); });
  await boot('continue');
  is('c5: save → Continue halfway: valves 1 and 3 open, 4 shut and shaking, its needle in the red', await ev(() => { const G = game; G.step(0.5); P.settle(); const A = G.rooms.condA;
    return { room: G.room?.id, open: A.valves.map((x) => x.open), shaking: A.valves.map((x) => !!x.shaking), g: A.gauges.read() }; }),
    (v) => v.room === 'condA' && v.open.join() === 'true,false,true,false' && v.shaking[3] && v.g.vals[2] > 0.85);
  is('c5: valve 4: all three needles steady in the green, the hangar door opens', await ev(() => { const G = game, A = G.rooms.condA, v = A.valves.find((x) => x.id === 4); for (const e of G.enemies) if (e.alive && e.group === 'condA') { for (let k = 0; k < 12 && e.alive; k++) { (e.take || e.damage).call(e, 3, G.hero.pos); G.step(0.1); } } G.step(2); P.settle();
    P.use(v.x, v.z, { near: 1.0, kind: 'c5valve' }); G.step(0.6); P.settle(); return { routed: !!G.flags.c5_routed, door: A.hangarDoor.isOpen, g: A.gauges.read(), shaking: A.valves.some((x) => x.shaking) }; }),
    (v) => v.routed && v.door && v.g.vals.every((x) => x < 0.5) && !v.g.flutter.some(Boolean) && !v.shaking);
  await ev(() => { const A = game.rooms.condA, v = A.valves.find((x) => x.id === 3); P.go(v.x + 0.6, v.z + 2.4, { tol: 0.4 }); P.face(v.x, v.z - 2); game.step(0.4); });
  await shot('c5-routed');
  }
}

// ================================================================ c7: the vent's seal
if (PARTS.includes('c7')) {
  await boot('new');
  is('c7: chapter 7, the dome\'s light on the glacier, the drone down', await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 5, chapterKey: 'pass', c6_started: true, c6_bridge: true, c6_heat: true, c6_thawed: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true });
    G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle(); P.settle();
    Object.assign(G.flags, { c7_keeper: true, c7_ice: true, c7_lit: true, c7_sendell: true, ob_dir: true, ob_set4: true, c7_scope: true, c7_droneSeen: true, c7_droneDown: true });
    G.story.applyFlags?.(); G.story.refreshCast(); G.step(0.5); P.settle();
    const M = G.rooms.hamalayi, V = M.vent; T.tp(V.x + 7, V.z + 6); G.step(1); P.settle(); return [G.flags.chapterKey, G.room?.id ?? 'hamalayi', M.vent.melted]; }), (v) => v[0] === 'observatory' && v[2] === true);
  await ev(() => { const V = game.rooms.hamalayi.vent; P.go(V.x + 5.5, V.z + 5.5, { tol: 0.5 }); P.face(V.x, V.z); game.step(0.6); });
  await shot('c7-seal');
  if (!BEFORE) {
  const n1 = await ev(() => window.SAID.length);
  // (DIALOGUE-2 pass 3: his line says only three steam; the ice on the other two is left to the eye, then the nudges)
  is('c7: the seal pressed (input): frozen fast; his line counts three steaming and leaves the ice unsaid; the objective counts five', await ev(() => { const V = game.rooms.hamalayi.vent; P.use(V.x + 3.2, V.z, { near: 1.2, kind: 'c7vent' }); P.settle(); return [!!game.flags.c7_vent, T.said(0).slice(-1)[0] || '', T.obj()]; }),
    (v) => !v[0] && /three of them are steaming/i.test(v[1]) && !/\bice\b/i.test(v[1]) && /5/.test(v[2]));
  void n1;
  const throwAt = (i) => ev((i) => { const G = game, M = G.rooms.hamalayi, V = M.vent, D = M.ventDiscs[i], a = Math.atan2(D.x - V.x, D.z - V.z), n = window.SAID.length, t0 = window.TOASTS.length;
    P.go(D.x + Math.sin(a) * 3.4, D.z + Math.cos(a) * 3.4, { tol: 0.5 }); G.hero.hp = G.hero.maxHp; P.tap('Digit1'); P.throwAt(D.x, D.z); P.settle();
    return { said: T.said(n), toasts: window.TOASTS.slice(t0), breathing: M.ventDiscs.map((d) => !!d.breathing) }; }, i);
  is('c7: a reasonable wrong try (chapter 4\'s rule): a ball at a steaming disc rings; he says it breathes already; nothing frees', await throwAt(0), (v) => v.said.some((s) => /breathing already/i.test(s)) && v.breathing.filter(Boolean).length === 3);
  is('c7: the ice on a capped disc broken by the ball: it breathes (4 of 5)', await throwAt(1), (v) => v.breathing[1] && v.breathing.filter(Boolean).length === 4);
  is('c7: the objective counts four of five', await ev(() => T.obj()), (v) => /4/.test(v) && /5/.test(v));
  await ev(() => { game.save(false); });
  await boot('continue');
  is('c7: save → Continue halfway: the freed disc still breathes, the other still capped', await ev(() => { const G = game; G.step(0.5); P.settle(); const M = G.rooms.hamalayi; return M.ventDiscs.map((d) => !!d.breathing); }), (v) => v[1] && !v[4] && v.filter(Boolean).length === 4);
  is('c7: an older save (the build before: its three warm discs all woken, the seal not turned) loads with the seal free', await ev(() => { const G = game, f = G.flags, M = G.rooms.hamalayi;
    delete f.c7_free1; Object.assign(f, { c7_disc0: true, c7_disc2: true, c7_disc3: true }); G.story.applyFlags(); G.step(0.1); const old = M.ventDiscs.filter((d) => d.breathing).length;
    f.c7_free1 = true; delete f.c7_disc0; delete f.c7_disc2; delete f.c7_disc3; G.story.applyFlags(); G.step(0.1); return [old, M.ventDiscs.filter((d) => d.breathing).length]; }), (v) => v[0] === 5 && v[1] === 4);
  is('c7: the last cap broken by a blow (input: the fist / sword): all five breathe, his line', await ev(() => { const G = game, M = G.rooms.hamalayi, V = M.vent, D = M.ventDiscs[4], a = Math.atan2(D.x - V.x, D.z - V.z), n = window.SAID.length;
    for (let k = 0; k < 6 && !D.breathing; k++) { P.go(D.x + Math.sin(a) * 1.0, D.z + Math.cos(a) * 1.0, { tol: 0.3 }); P.face(D.x, D.z); G.hero.hp = G.hero.maxHp; P.tap('KeyK', 0.6); P.settle(); }
    return { all: M.ventDiscs.every((d) => d.breathing), said: T.said(n) }; }), (v) => v.all && v.said.some((s) => /turn/i.test(s)));
  is('c7: the seal turns: the vent breathes', await ev(() => { const V = game.rooms.hamalayi.vent; P.use(V.x + 3.2, V.z, { near: 1.2, kind: 'c7vent' }); game.step(2); P.settle(); return [!!game.flags.c7_vent, T.obj()]; }), (v) => v[0] && v[1].length > 0);
  await ev(() => { const V = game.rooms.hamalayi.vent; P.go(V.x + 5.5, V.z + 5.5, { tol: 0.5 }); P.face(V.x, V.z); game.step(1.5); });
  await shot('c7-open');
  }
}

// ================================================================ c15: the cooling machinery
if (PARTS.includes('c15')) {
  await boot('new');
  is('c15: chapter 15, the deep installation', await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
    G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle();
    Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_mills: true, c2_signal: true });
    G.story.cur.toShell?.(); G.step(1.5); P.settle(); G.step(0.5); P.settle();
    for (let i = 0; i < 12 && G.story.cur.key !== 'shell'; i++) { G.story.nextChapter(); G.step(0.5); P.settle(); }
    const e = G.room.exits.find((x) => x.to === 'c3-deep'); T.tp(e.x, e.z, 0, e.y ?? G.hero.pos.y + 0.5); G.step(1.6); P.settle();
    for (const en of G.enemies) if (en.alive && en.group === 'c3deep') { for (let k = 0; k < 12 && en.alive; k++) { (en.take || en.damage).call(en, 3, G.hero.pos); G.step(0.1); } }
    G.step(2); P.settle(); return [G.story.cur.key, G.room?.id]; }), (v) => v[0] === 'shell' && v[1] === 'c3deep');
  await ev(() => { const D = game.room.diagram; P.go(D.x + 2.2, D.z + 0.6, { tol: 0.5 }); P.face(D.x, D.z); game.step(0.6); });
  await shot('c15-diagram');
  if (!BEFORE) {
    is('c15: arrival: the drain (B) found running, the drive turning at speed, nothing cooled', await ev(() => { const D = game.room, v = D.valves.find((x) => x.id === 'B'); return [v.open, !!game.flags.c3_cooled, D.drive.starved, +D.drive.speed.toFixed(2)]; }),
      (v) => v[0] && !v[1] && v[2] === false && v[3] > 0.9);
    is('c15: the diagram (input): one pump for the drive and the exchanger, the drain', await ev(() => { const D = game.room.diagram, n = window.SAID.length; P.use(D.x, D.z, { kind: 'c3diagram' }); P.settle(); return T.said(n)[0] || ''; }),
      (v) => /pump/i.test(v) && /drive/i.test(v) && /drain/i.test(v) && !/crossed|A and C/i.test(v));
    is('c15: valve A (input): one feed, the drive still at speed', await ev(() => { const D = game.room, v = D.valves.find((x) => x.id === 'A'); P.use(v.x, v.z, { kind: 'c3valve', near: 1.2 }); game.step(3); P.settle(); return [v.open, D.drive.starved, +D.drive.speed.toFixed(2), !!game.flags.c3_cooled]; }),
      (v) => v[0] && !v[1] && v[2] > 0.9 && !v[3]);
    // (valve C is on the catwalk: the stair and the knocker are chapter3.mjs's; here he is set on the catwalk by it: staged)
    is('c15: valve C with the drain running: the drive starves (it slows, his line), nothing cooled', await ev(() => { const G = game, D = G.room, v = D.valves.find((x) => x.id === 'C'), n = window.SAID.length; T.useAt(v.x, v.z, v.y); G.step(4); P.settle();
      return [v.open, D.drive.starved, +D.drive.speed.toFixed(2), !!G.flags.c3_cooled, T.said(n)]; }), (v) => v[0] && v[1] && v[2] < 0.6 && !v[3] && v[4].some((s) => /drive/i.test(s)));
    await ev(() => { const v = game.room.valves.find((x) => x.id === 'B'); T.tp(v.x - 1.6, v.z - 1.2); P.face(v.x, v.z); game.step(0.6); });
    await shot('c15-starved');
    await ev(() => { game.save(false); });
    await boot('continue');
    is('c15: save → Continue halfway: the three valves open, the drive still starving', await ev(() => { const G = game; G.step(3); P.settle(); const D = G.room; return [G.room?.id, D.valves.map((v) => v.open).join(), D.drive.starved]; }),
      (v) => v[0] === 'c3deep' && v[1] === 'true,true,true' && v[2]);
    is('c15: the drain (B) shut (input): the loop closes, the exchanger cools, the drive back to speed', await ev(() => { const G = game, D = G.room, v = D.valves.find((x) => x.id === 'B');
      for (const en of G.enemies) if (en.alive && en.group === 'c3deep') { for (let k = 0; k < 12 && en.alive; k++) { (en.take || en.damage).call(en, 3, G.hero.pos); G.step(0.1); } }
      P.use(v.x, v.z, { kind: 'c3valve', near: 1.2 }); G.step(5); P.settle(); return [v.open, !!G.flags.c3_cooled, D.drive.starved, +D.drive.speed.toFixed(2)]; }),
      (v) => !v[0] && v[1] && !v[2] && v[3] > 0.9);
    await shot('c15-cooled');
  }
}

await browser.close();
if (!BEFORE) done();
