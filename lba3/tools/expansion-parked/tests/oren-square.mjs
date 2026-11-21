// OREN-GUARDIAN increment D: chapter 11 of the expanded campaign ("Under the Well", key 'survey'), OG-2 "The Fenced
// Square" (docs/future/EXPANSION_PLAN.md Revision R1.11). End to end, by input wherever it is a player's step
// (tests/lib/player.js: keys, the game's own time step, A* over its collision):
//   the fortress shelter's thanks (chapter 10's end) → chapter 11's card → Gilbert asks for his well → the gate (walked
//   to): Oren speaks through its lock, his condition → Bram: the draw-off's lever, let go too soon (it slams shut on
//   the drill's stroke: no progress), then held through a stroke (Bram feels it, agrees: 1/3) → Save → Continue
//   → Ume: Mira's tap at the Water Office (walked to), the bottle, Ume agrees (2/3) → Pico: the ball on the gate's bell
//   latch (Oren's hold shaken, the bolt stays), Pico agrees (3/3) → the gate opens (the panel slides, the lamp
//   celadon, the well reachable), the turn → Save → Continue → Gilbert at the shelter: the board, Baldino's call
//   → the ship to Zeelich → the network begins in Baldino's workshop.
// Also: a valid other order (the bell before Pico asks; Ume before Bram), a save at chapter 11's card (replays
// Gilbert's ask), an increment-B save in chapter 10 waiting for the ship (goes on to chapter 11 at the shelter), the
// gate's state on a reload in the network (re-entry after the world change), the base campaign (exp_base) never
// showing any of it, and the draw cost at the square. Times are the bot's game time (a floor, not a first-time
// estimate). SwiftShader: draw counts only, never fps.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
let played = 0;
const timed = async (f, a) => { const t0 = await ev(() => game.time); const r = await ev(f, a); played += (await ev(() => game.time)) - t0; return r; };

const UP_TO_VOTE = { prologueDone: true, intro: true, c1_started: true, c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
  c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_home: true, c8_gilbert: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_pippa: true, c8_zoeDone: true, c8_done: true, c9_started: true, c9_heard: true, c9_vote: true, ml_2: true, ml_3: true };
const OG1 = { og_started: true, og_home: true, og_arrived: true, og_room: true, og_bleed: 3, og_steady: true };
const save = (flags, room = null, x = -36, z = -10) => ({ v: 6, at: Date.now(), room, hero: { x, z, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { exp: 1, ...flags }, killed: [], collected: [], searched: [], crates: [], loot: [] });

const helpers = () => ev(() => {
  const G = game;
  window.__said = []; const say0 = G.say.bind(G);
  G.say = (name, text, cb, sp, col) => { window.__said.push((name ? name + ': ' : '') + (Array.isArray(text) ? text.join(' ') : text)); return say0(name, text, cb, sp, col); };
  window.__cards = []; const H = G.hud, cc = H.chapterCard.bind(H); H.chapterCard = (a, b) => { window.__cards.push((a ? a + ' · ' : '') + b); return cc(a, b); };
  const sv = () => G.story.chapters.find((c) => c.key === 'survey');
  window.T = {
    sv,
    obj: () => document.querySelector('#pause-objective')?.textContent || '',
    at: (dx, dz) => sv().at(dx, dz),
    npcAt: (id) => { const n = G.npcs.find((x) => x.def.id === id); return n?.present ? { x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2), held: !!n.held } : null; },
    view: () => {
      const f = G.flags, S = sv(), seg = S.seg;
      return { key: f.chapterKey, room: G.room?.id ?? 'citadel', state: G.state,
        started: !!f.og2_started, met: !!f.og2_met, bramAsk: !!f.og2_bramAsk, bram: !!f.og2_bram, umeAsk: !!f.og2_umeAsk, tonic: !!f.og2_tonic, ume: !!f.og2_ume, picoAsk: !!f.og2_picoAsk, bell: !!f.og2_bell, pico: !!f.og2_pico, open: !!f.og2_open, asked: !!f.og2_asked, done: !!f.og2_done,
        agreed: S.agreed?.(), lamps: S.lock ? S.lock.lamps.map((l) => l.material.emissive?.getHexString?.() ?? 'off') : null,
        slide: +(S.slide ?? -1).toFixed(2), panelDx: seg ? +(seg.mesh.position.x - S.panel0.x).toFixed(2) : null, segCol: seg?.col.enabled, openCol: S.openCol?.enabled, props: S.props?.visible, lockShown: S.lock?.group.visible,
        rings: S.pres ? +S.pres.shown.toFixed(2) : null, board: S.board?.visible, lever: +(S.leverA ?? 0).toFixed(2),
        bramAt: T.npcAt('bram'), umeAt: T.npcAt('ume'), picoAt: T.npcAt('pico'), obj: T.obj(), journal: G.story.journal().map((c) => c.title), items: (G.story.items?.() || []).map((i) => i.id) };
    },
    // the drill's stroke: step until just after the next one
    toStroke() { const S = sv(); let p0 = S.lastP; for (let k = 0; k < 400; k++) { G.step(1 / 30); if (S.lastP < p0) break; p0 = S.lastP; } G.step(0.15); },
    draws() { const R = G.renderer.renderer; let main = 0, shadow = 0; const o = R.renderBufferDirect.bind(R); R.renderBufferDirect = (cam, scene, ...a) => { if (scene) main++; else shadow++; return o(cam, scene, ...a); }; G.perf.beginFrame(); G.frame(1 / 30, true); R.renderBufferDirect = o; return { main, shadow }; },
  };
});
const reload = async () => { await open(page, '?nocine'); await helpers(); await page.click('#btn-continue'); await ev(() => { game.step(0.05); P.settle(); for (let i = 0; i < 10; i++) game.step(0.1); P.settle(); }); };

// ---------------------------------------------------------------- chapter 10's end → chapter 11
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
const s0 = await ev(([F, O]) => {
  const G = game; P.settle();
  Object.assign(G.flags, F, O, { chapter: 9, chapterKey: 'throttle' }); G.hero.hasBall = true;
  G.story.applyFlags(); G.updateObjective();
  const t0 = G.time;
  // (set-up: out by the asylum climb's foot, the way up since CLIMB-1 — the ledge west of it is no way up)
  if (G.room) { G.exitRoom({ x: -33.3, z: -34.6, a: Math.PI }, true); G.step(0.5); P.settle(); } else P.go(-33.3, -36.4, { tol: 1.2, run: true });
  const r = P.talk('gilbert', { run: true });
  for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  return { r, ...T.view(), cards: [...window.__cards], said: window.__said.slice(-10), dt: G.time - t0 };
}, [UP_TO_VOTE, OG1]);
played += s0.dt;
console.log('chapter 11 start:', JSON.stringify(s0));
check("the fortress shelter's thanks end chapter 10 (Oren thanked, no call from Baldino there) and chapter 11's card shows: \"Under the Well\"", s0.key === 'survey' && s0.cards.some((c) => /Chapter 11 · Under the Well/.test(c)) && s0.said.some((l) => /Oren, if you can hear this/.test(l)) && !s0.said.some((l) => /Baldino\. The council's done its bit/.test(l)), { key: s0.key, cards: s0.cards });
check("Gilbert asks for his well at the shelter's door; the objective names the gate; the journal has 11. Under the Well", s0.started && s0.said.some((l) => /I want my well back/.test(l)) && s0.said.some((l) => /project property/.test(l)) && /gate to Gilbert's well/.test(s0.obj) && s0.journal.includes('11. Under the Well'), { obj: s0.obj, j: s0.journal });
check("the gate is shut (its panel in place, its collider on), the lock shows, the queue stands at it (Ume and Pico held off their rounds)", s0.panelDx === 0 && s0.segCol === true && s0.openCol === false && s0.lamps?.length === 3 && !!s0.bramAt && s0.umeAt?.held && s0.picoAt?.held, s0);

// ---------------------------------------------------------------- the gate: Oren's condition
const s1 = await timed(() => { const p = T.at(0.4, 3.2); const r = P.go(p.x, p.z, { tol: 0.6, run: true }); P.settle(); for (let i = 0; i < 25; i++) game.step(0.1); return { r: r.r, ...T.view(), said: window.__said.slice(-9) }; });
console.log('the gate:', JSON.stringify(s1));
check("walked to the gate: Oren speaks through its lock (knows his step; Ballastra stock on the project's cable; his condition: one cask a family while the drill pulls, three must agree)", s1.met && s1.said.some((l) => /I know your step/.test(l)) && s1.said.some((l) => /Ballastra stock and cabled it to the station/.test(l)) && s1.said.some((l) => /One cask a family, while the drill pulls\. Three are waiting/.test(l)), s1.said);
check("his rings stand on the lock; no lamp lit; the objective counts agreements (0/3) and lists the three to hear out", s1.rings === 1 && /\(0\/3\)/.test(s1.obj) && /Hear Bram out/.test(s1.obj) && /Hear Granny Ume out/.test(s1.obj) && /Hear Pico out/.test(s1.obj), { rings: s1.rings, obj: s1.obj, lamps: s1.lamps });
const look = await timed(() => { const S = T.sv(), c = S.lockP; const r = P.use(c.x, c.z + 0.25, { near: 0.9, kind: 'og2lock' }); return { r: r.r, said: window.__said.slice(-2) }; });
check('the lock can be inspected: Balance Works, three lamps, no hand lever', look.said.some((l) => /BALANCE WORKS · BALLASTRA.*no hand lever/.test(l)) && look.said.some((l) => /None of the lamps is lit/.test(l)), look);

// ---------------------------------------------------------------- Bram and the lever: let go too soon, then hold
const b0 = await timed(() => { const r = P.talk('bram'); return { r: r.r, ...T.view(), said: window.__said.slice(-4) }; });
check("Bram fears a voice deciding the water; he points at the draw-off's lever", b0.bramAsk && b0.said.some((l) => /draw-off has a lever, and the box holds it shut/.test(l)) && /Show Bram the draw-off's lever/.test(b0.obj), b0);
const early = await timed(() => {
  const G = game, lv = T.at(-1.95, 1.9);
  P.go(lv.x, lv.z, { tol: 0.35 }); P.face(lv.x, lv.z - 1);
  const tg = P.target()?.kind;
  T.toStroke();   // (right after a stroke: the next is 3.6 s away)
  P.tap('KeyE', 0.1); G.step(0.5);
  const holding = G.state, leverOpen = T.sv().leverA < 0;
  P.tap('ArrowDown', 0.05); G.step(0.2);
  const afterLetGo = { state: G.state, lever: T.sv().leverA < 0 };
  T.toStroke(); const shut = T.sv().leverA;
  const n0 = window.__said.length; P.settle();
  return { tg, holding, leverOpen, afterLetGo, shut: +shut.toFixed(2), said: window.__said.slice(n0 - 2), ...T.view() };
});
console.log('let go too soon:', JSON.stringify(early));
check("the lever: E throws it and he holds it (a scene: no save); the water runs", early.tg === 'og2lever' && early.holding === 'cutscene' && early.leverOpen, early);
check("let go before the drill's stroke: it stays over until the stroke, then slams shut; Bram: shut the moment you let go; no agreement", early.afterLetGo.state === 'play' && early.afterLetGo.lever && early.shut > 0.3 && early.said.some((l) => /Shut the moment you let go/.test(l)) && !early.bram && early.agreed === 0, early);
const held = await timed(() => { const lv = T.at(-1.95, 1.75); const r = P.use(lv.x, lv.z, { near: 0.6, kind: 'og2lever' }); for (let i = 0; i < 40; i++) game.step(0.1); P.settle(); return { r: r.r, ...T.view(), said: window.__said.slice(-12) }; });
console.log('held through a stroke:', JSON.stringify(held));
check("held through a stroke: the lever shoves on the thump and he keeps it; Bram feels it himself; let go, Oren shuts it", held.said.some((l) => /It can't take the lever out of my hands/.test(l)) && held.said.some((l) => /Pushes like a mule/.test(l)) && held.said.some((l) => /Then I close it/.test(l)) && held.lever > 0.3, held.said);
check("Bram says it at the lock and Oren counts: one lamp lit (1/3); the journal records the lever's rule", held.bram && held.agreed === 1 && held.said.some((l) => /I know where the lever is/.test(l)) && held.said.some((l) => /n_oren: One\./.test(l)) && /\(1\/3\)/.test(held.obj), { obj: held.obj, lamps: held.lamps });

// Save → Continue mid-quest
await ev(() => game.save(false));
await reload();
const r1 = await ev(() => T.view());
console.log('reload mid-quest:', JSON.stringify(r1));
check('Save → Continue mid-quest: chapter 11, one agreement kept (one lamp, 1/3), the gate shut, the queue back at it, the rings up', r1.key === 'survey' && r1.bram && r1.agreed === 1 && /\(1\/3\)/.test(r1.obj) && r1.panelDx === 0 && r1.segCol === true && !!r1.bramAt && r1.umeAt?.held && r1.picoAt?.held && r1.rings === 1 && r1.state === 'play', r1);

// ---------------------------------------------------------------- Ume: Mira's tap
const u0 = await timed(() => { const r = P.talk('ume'); return { r: r.r, ...T.view(), said: window.__said.slice(-4) }; });
check("Granny Ume's tonic wants cold water; Twinsen offers Mira's tap; the objective and the marker send him to the Water Office", u0.umeAsk && u0.said.some((l) => /Mira's tap runs cold/.test(l)) && /cold water from Mira's tap/.test(u0.obj), u0);
const m0 = await timed(() => { const r = P.talk('mira', { run: true }); return { r: r.r, ...T.view(), said: window.__said.slice(-5) }; });
console.log("Mira's tap:", JSON.stringify(m0));
check("walked into the Water Office: Mira fills the bottle; a bucket a minute before Oren, a bottle a minute now (help that limits)", m0.room === 'office' && m0.tonic && m0.items.includes('tonic') && m0.said.some((l) => /A bucket a minute, before your Oren took the mains/.test(l)), m0);
const u1 = await timed(() => { P.exitTo('outdoor-office'); const r = P.talk('ume', { run: true }); for (let i = 0; i < 30; i++) game.step(0.1); P.settle(); return { r: r.r, ...T.view(), said: window.__said.slice(-5) }; });
check('back at the gate: Ume takes the bottle and agrees at the lock (2/3); the bottle is gone from the inventory', u1.ume && !u1.tonic && !u1.items.includes('tonic') && u1.agreed === 2 && u1.said.some((l) => /n_oren: Two\./.test(l)) && /\(2\/3\)/.test(u1.obj), u1);

// ---------------------------------------------------------------- Pico: the ball on the bell latch
const p0 = await timed(() => { const r = P.talk('pico'); return { r: r.r, ...T.view(), said: window.__said.slice(-4) }; });
check("Pico wants the bell on the gate's latch rung with the ball", p0.picoAsk && p0.said.some((l) => /ring the bell on the latch with your ball/.test(l)) && /bell latch with the ball/.test(p0.obj), p0);
const p1 = await timed(() => {
  const G = game, S = T.sv(), b = S.ballTargets()[0];
  let tries = 0;
  for (; tries < 6 && !G.flags.og2_bell; tries++) { const a = 0.35 * (tries - 2); P.go(b.x + Math.sin(a) * 3.2, b.z + Math.cos(a) * 3.2, { tol: 0.4 }); P.face(b.x, b.z); P.tap('KeyF', 0.05); G.step(1.4); P.settle(); }
  for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  return { tries, ...T.view(), said: window.__said.slice(-16) };
});
console.log('the bell:', JSON.stringify(p1));
check("the ball rings the bell: Oren's hold is shaken for a moment but the bolt stays (no lever on the lock); Pico agrees (3/3)", p1.bell && p1.said.some((l) => /That shakes my hold for a moment\. The bolt stays where it is\. It has no lever/.test(l)) && p1.pico && p1.said.some((l) => /n_oren: Three\./.test(l)), { tries: p1.tries, said: p1.said });
check('the gate opens: the panel slides away, the lamps celadon, the collider moves with it; the turn: three agreed for the whole town', p1.open && p1.slide === 1 && p1.panelDx > 2.4 && p1.segCol === false && p1.openCol === true && p1.said.some((l) => /Three were here\. The rest will find it open/.test(l)) && p1.said.some((l) => /Nobody asked the rest whether they want a ration/.test(l)), p1);
check('after the gate: Ume and Pico go back to their rounds; Bram stands by the draw-off; the objective sends him to Gilbert', !p1.umeAt?.held && !p1.picoAt?.held && !!p1.bramAt && /Tell Gilbert/.test(p1.obj), { ume: p1.umeAt, pico: p1.picoAt, bram: p1.bramAt, obj: p1.obj });
const in1 = await timed(() => { const W = game.world.well; const r = P.go(W.x + 1.6, W.z + 1.0, { tol: 0.6 }); const d = Math.hypot(game.hero.pos.x - W.x, game.hero.pos.z - W.z); const u = P.use(W.x, W.z + 1.6, { near: 1.2, kind: 'og2well' }); return { r: r.r, d: +d.toFixed(2), said: window.__said.slice(-1) }; });
check("the square is open: he walks in to Gilbert's well (warm, and low)", in1.d < 3 && in1.said.some((l) => /warm, and low/.test(l)), in1);

// Save → Continue after the world change
await ev(() => game.save(false));
await reload();
const r2 = await ev(() => { for (let i = 0; i < 20; i++) game.step(0.1); return T.view(); });
check('Save → Continue after the gate: it loads open (slid, colliders swapped, lamps celadon), the queue gone from it, Gilbert next', r2.open && r2.slide === 1 && r2.panelDx > 2.4 && r2.segCol === false && r2.openCol === true && !r2.umeAt?.held && /Tell Gilbert/.test(r2.obj) && r2.state === 'play', r2);

// ---------------------------------------------------------------- Gilbert, the board, Baldino → the network
const g1 = await timed(() => { const r = P.talk('gilbert', { run: true }); P.settle(); return { r: r.r, ...T.view(), said: window.__said.slice(-8) }; });
console.log('Gilbert:', JSON.stringify(g1));
check("Gilbert: nobody asked him, and it's his well; a board on the gate; Baldino calls him to Zeelich", g1.asked && g1.done && g1.board && g1.said.some((l) => /Nobody asked me, and it's my well/.test(l)) && g1.said.some((l) => /anyone who says no says it to me, not to a box/.test(l)) && g1.said.some((l) => /Baldino\. The council's done its bit/.test(l)) && /back to Zeelich/.test(g1.obj) && g1.rings === 0, g1);
const s4 = await timed(() => { const r = P.shipTo('citadel_port'); for (let i = 0; i < 40; i++) { game.step(0.1); P.settle(); } return { r, key: game.flags.chapterKey, room: game.room?.id ?? 'citadel', c10: !!game.flags.c10_started }; });
console.log('to the network:', JSON.stringify(s4));
check("the ship to Zeelich ends chapter 11: the network begins in Baldino's workshop (chapters 12–13 still pass through)", s4.key === 'network' && s4.room === 'workshop' && s4.c10, s4);
console.log(`OG-2 bot game time, chapter 11's card to the network's start: ${played.toFixed(0)} s (${(played / 60).toFixed(1)} min; a floor: A* walking, every line read at once; not a first-time estimate)`);
// the gate's state in a later chapter, after a reload
await ev(() => game.save(false));
await reload();
const r3 = await ev(() => T.view());
check('in the network after a reload: the square stays open (the panel slid, its collider swapped), the board up, the lamps celadon, no rings', r3.key === 'network' && r3.slide === 1 && r3.segCol === false && r3.board === true && r3.rings === 0, r3);

// ---------------------------------------------------------------- other ways in, another order
// a save made at chapter 11's card (before Gilbert's ask was heard): replays it at the shelter
await ev(([F, O]) => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 6, at: Date.now(), room: null, hero: { x: -46, z: -60, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { exp: 1, ...F, ...O, og_thanks: true, og_done: true, chapter: 10, chapterKey: 'survey' }, killed: [], collected: [], searched: [], crates: [], loot: [] })); }, [UP_TO_VOTE, OG1]);
await reload();
const o1 = await ev(() => { P.settle(); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { ...T.view(), said: window.__said.slice(-4) }; });
check("a save at chapter 11's card resumes with Gilbert's ask at the shelter", o1.key === 'survey' && o1.started && o1.said.some((l) => /I want my well back/.test(l)) && /gate to Gilbert's well/.test(o1.obj), o1);
// increment B's ending: a chapter-10 save waiting for the ship to Zeelich (og_done) goes on to chapter 11
await ev(([F, O]) => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 6, at: Date.now(), room: null, hero: { x: -36, z: -10, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { exp: 1, ...F, ...O, og_thanks: true, og_done: true, chapter: 9, chapterKey: 'throttle' }, killed: [], collected: [], searched: [], crates: [], loot: [] })); }, [UP_TO_VOTE, OG1]);
await reload();
const o2 = await ev(() => { P.settle(); for (let i = 0; i < 40; i++) game.step(0.1); P.settle(); const g = game.npcs.find((n) => n.def.id === 'gilbert'); return { ...T.view(), dGil: +Math.hypot(game.hero.pos.x - g.pos.x, game.hero.pos.z - g.pos.z).toFixed(1), cards: [...window.__cards] }; });
check("an increment-B save in chapter 10 waiting for the ship (og_done) goes on to chapter 11 at the shelter's door, by Gilbert", o2.key === 'survey' && o2.started && o2.dGil < 6 && o2.cards.some((c) => /Chapter 11/.test(c)), o2);
// another order: Ume's errand before Bram, the bell before Pico has asked
const alt = await ev(() => {
  const G = game, f = G.flags;
  Object.assign(f, { og2_met: true }); G.story.applyFlags(); G.updateObjective();
  const p = T.at(0.4, 3.4); P.go(p.x, p.z, { tol: 0.6 }); P.settle();
  P.talk('ume'); const umeFirst = !!f.og2_umeAsk && !f.og2_bramAsk;
  const tg = T.sv().ballTargets()[0];
  for (let k = 0; k < 6 && !f.og2_bell; k++) { const a = 0.35 * (k - 2); P.go(tg.x + Math.sin(a) * 3.2, tg.z + Math.cos(a) * 3.2, { tol: 0.4 }); P.face(tg.x, tg.z); P.tap('KeyF', 0.05); G.step(1.4); P.settle(); }
  const bellNoAsk = !!f.og2_bell && !f.og2_picoAsk && !f.og2_pico;
  P.talk('pico'); for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  return { umeFirst, bellNoAsk, ...T.view(), said: window.__said.slice(-6) };
});
check('another order: Ume asked before Bram; the bell rung before Pico asked; Pico then agrees at once (1/3)', alt.umeFirst && alt.bellNoAsk && alt.pico && alt.agreed === 1 && alt.said.some((l) => /I saw it!/.test(l)), alt);
// the cost at the square: OG-2's props and rings shown / hidden
const cost = await ev(() => { const S = T.sv(), p = T.at(0.4, 4.5); game.hero.pos.set(p.x, game.physics.groundAt(p.x, p.z), p.z); game.hero.angle = Math.PI; for (let i = 0; i < 10; i++) game.step(0.1); const on = T.draws(); S.near = () => false; const off = T.draws(); delete S.near; S.show(); let meshes = 0, lights = 0, transp = 0; S.props.traverse((o) => { if (o.isMesh) { meshes++; if (o.material.transparent) transp++; } if (o.isLight) lights++; }); return { on, off, meshes, lights, transp }; });
console.log('square draws (OG-2 props shown / hidden):', JSON.stringify(cost));
check('the cost at the square: no lights, no transparency; at most 30 more draw calls (main + shadow) with the lock, the draw-off and the rings', cost.lights === 0 && cost.transp === 0 && (cost.on.main + cost.on.shadow) - (cost.off.main + cost.off.shadow) <= 30, cost);
// the base campaign never shows any of it
const b0x = await ev(() => { const G = game; Object.assign(G.flags, { exp_base: 1, chapterKey: 'network', chapter: 13, c10_started: true, og2_open: true }); delete G.flags.exp; G.story.applyFlags(); const S = T.sv(); for (let i = 0; i < 5; i++) G.step(0.1); return { props: S.props.visible, panelDx: +(S.seg.mesh.position.x - S.panel0.x).toFixed(2), segCol: S.seg.col.enabled, openCol: S.openCol.enabled, inCampaign: G.story.inCampaign('survey') }; });
check('the base campaign (exp_base) never shows the lock, the draw-off or an open gate, even with a stray og2_open flag', b0x.props === false && b0x.panelDx === 0 && b0x.openCol === false && b0x.inCampaign === false, b0x);

done();
await browser.close();
