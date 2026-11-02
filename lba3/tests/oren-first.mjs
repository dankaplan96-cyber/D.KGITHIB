// OREN-GUARDIAN increment B: chapter 10 of the expanded campaign ("Borrowed Time", key 'throttle'), OG-1 "A Steady
// Hand", the first encounter with Oren (docs/future/EXPANSION_PLAN.md Revision R1.11). End to end, by input wherever it
// is a player's step (tests/lib/player.js: keys, the game's own time step, A* over its collision):
//   the vote → chapter 10's card → Mira's call over the lighthouse relay → the ship home (a seen crossing; ?nocine here)
//   → the Water Office (walked to) → Mira takes him down → FunFrock's valve room: the hammer (needles, the bang);
//   a wheel opened between kicks kicks back (no damage, no progress); opened during a kick it bleeds the kick (×3)
//   → the governor rings: Oren's rings rise, he speaks, the needles settle on green; wheel IV turns itself back
//   → the fortress shelter (walked to): Gilbert, Tim and Lulu thank him and Oren → the chapter ends there: chapter 11
//   (OG-2, tests/oren-square.mjs) begins at the same door. (Baldino's call and the ship to Zeelich moved to OG-2's end.)
// Recovery: Save → Continue mid-hammer (the bleeds kept) and after Oren (needles on green, the rings up); a save in
// chapter 10 from before this chapter had content (batch 1's empty shell) resumes it; a resume already on Citadel
// skips the flight; the base campaign (exp_base) never shows the governor. Cost: the valve room's draws with and
// without the governor and the rings (SwiftShader here: draw counts only, never fps). Times are the bot's game time
// (a floor for a first-time player, not an estimate of one).
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
// the bot's game time in the chapter, summed over its segments (each within one page; reloads and checks excluded)
let played = 0;
const timed = async (f, a) => { const t0 = await ev(() => game.time); const r = await ev(f, a); played += (await ev(() => game.time)) - t0; return r; };

const UP_TO_VOTE = { prologueDone: true, intro: true, c1_started: true, c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
  c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_home: true, c8_gilbert: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_pippa: true, c8_zoeDone: true, c8_done: true, c9_started: true, c9_heard: true, c9_vote: true, ml_2: true, ml_3: true };
// in-page helpers: the lines said (a wrapper on game.say: Story.nextChapter keeps it), the cards shown, a timed wheel
const helpers = () => ev(() => {
  const G = game;
  window.__said = []; const say0 = G.say.bind(G);
  G.say = (name, text, cb, sp, col) => { window.__said.push((name ? name + ': ' : '') + (Array.isArray(text) ? text.join(' ') : text)); return say0(name, text, cb, sp, col); };
  window.__cards = []; const H = G.hud, cc = H.chapterCard.bind(H); H.chapterCard = (a, b) => { window.__cards.push((a ? a + ' · ' : '') + b); return cc(a, b); };
  window.T = {
    f: () => ({ ...G.flags }),
    obj: () => document.querySelector('#pause-objective')?.textContent || '',
    view: () => { const f = G.flags, ch = G.story.cur, V = G.regions.built('valves'); return { key: f.chapterKey, chapter: f.chapter, room: G.room?.id ?? 'citadel', state: G.state, started: !!f.og_started, home: !!f.og_home, arrived: !!f.og_arrived, inRoom: !!f.og_room, bleed: f.og_bleed | 0, steady: !!f.og_steady, thanks: !!f.og_thanks, done: !!f.og_done, needle: ch.needle != null ? +ch.needle.toFixed(2) : null, shown: ch.pres ? +ch.pres.shown.toFixed(2) : null, govVisible: ch.gov ? ch.gov.visible : null, hammer: ch.hammering?.() ?? null, mira: (() => { const n = G.npcs.find((x) => x.def.id === 'mira'); return n?.present ? [+n.pos.x.toFixed(1), +n.pos.z.toFixed(1)] : null; })(), obj: T.obj(), hp: G.hero.hp, journal: G.story.journal().map((c) => c.title), V: !!V }; },
    // stand at valve i, facing it, and press E at a moment of the hammer's cycle: 'kick' (just before the bang: the
    // turn lands in the kick) or 'still' (half way between kicks)
    wheel(i, when) {
      const V = G.rooms.valves, v = V.valves[i], ch = G.story.cur;
      P.go(v.x, v.z + 0.65, { tol: 0.3 }); P.face(v.x, v.z);
      const tg = P.target();
      for (let k = 0; k < 600; k++) { const p = ch.phase(); if (when === 'kick' ? p > 0.92 && p < 0.985 : p > 0.5 && p < 0.6) break; G.step(1 / 60); }
      const b0 = G.flags.og_bleed | 0, x0 = G.hero.pos.x, z0 = G.hero.pos.z, hp0 = G.hero.hp, n0 = window.__said.length;
      P.tap('KeyE', 0.05); G.step(0.9);
      const moved = +Math.hypot(G.hero.pos.x - x0, G.hero.pos.z - z0).toFixed(2);
      P.settle();
      return { target: tg?.kind, before: b0, bleed: G.flags.og_bleed | 0, moved, hpLost: hp0 - G.hero.hp, said: window.__said.slice(n0), state: G.state };
    },
    // the valve room's draw calls in one frame (main and shadow passes), as tests/drawcalls.mjs counts them
    draws() { const R = G.renderer.renderer; let main = 0, shadow = 0; const o = R.renderBufferDirect.bind(R); R.renderBufferDirect = (cam, scene, ...a) => { if (scene) main++; else shadow++; return o(cam, scene, ...a); }; G.perf.beginFrame(); G.frame(1 / 30, true); R.renderBufferDirect = o; return { main, shadow }; },
  };
});
const reload = async () => { await open(page, '?nocine'); await helpers(); await page.click('#btn-continue'); await ev(() => { game.step(0.05); P.settle(); for (let i = 0; i < 10; i++) game.step(0.1); }); };

// ---------------------------------------------------------------- the vote → chapter 10
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
const s0 = await ev((F) => {
  const G = game; P.settle();
  Object.assign(G.flags, F, { chapter: 8, chapterKey: 'council' }); G.hero.hasBall = true;
  G.enterRoom('council', null, true); G.step(0.5);
  const t0 = G.time;
  G.story.nextChapter(); G.step(0.2);
  const atCard = { key: G.flags.chapterKey, room: G.room?.id, cards: [...window.__cards] };
  P.settle(); for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  return { atCard, ...T.view(), said: window.__said.slice(0, 6), dt: G.time - t0 };
}, UP_TO_VOTE);
played += s0.dt;
console.log('chapter 10 start:', JSON.stringify(s0));
check('after the vote the expanded campaign goes to chapter 10, "Borrowed Time" (its card shown), not straight to the network', s0.atCard.key === 'throttle' && s0.atCard.cards.some((c) => /Chapter 10 · Borrowed Time/.test(c)), s0.atCard);
check("Mira's call over the lighthouse relay is said in the council chamber; the ship takes him home to Citadel (a seen crossing; no film under ?nocine)", s0.said.some((l) => /lighthouse relay\. The mains under town are hammering/.test(l)) && s0.room === 'citadel' && s0.home && s0.arrived && s0.state === 'play', s0);
check('the objective sends him to Mira at the Water Office; the journal has "10. Borrowed Time"', /Water Office/.test(s0.obj) && s0.journal.includes('10. Borrowed Time'), { obj: s0.obj, j: s0.journal });

// ---------------------------------------------------------------- the Water Office → the valve room (walked)
const s1 = await timed(() => { const r = P.talk('mira', { run: true }); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { r, ...T.view() }; });
console.log('down to the valves:', JSON.stringify(s1));
check('walked to the Water Office; Mira takes him down to FunFrock\'s valve room and stands by him; the hammer runs', s1.r.r === 'talked' && s1.room === 'valves' && s1.inRoom && s1.hammer === true && !!s1.mira && /Ease the hammer/.test(s1.obj), s1);
const hm = await timed(() => { const ns = []; for (let i = 0; i < 64; i++) { game.step(0.05); ns.push(game.story.cur.needle); } return { max: +Math.max(...ns).toFixed(2), min: +Math.min(...ns).toFixed(2) }; });
check('the hammer is readable: the needles leap near the top of the dial and sag near the bottom on each 3.2 s cycle', hm.max > 2.8 && hm.min < 0.5, hm);

// ---------------------------------------------------------------- a mistimed wheel; then the bleeds
const early = await timed(() => T.wheel(0, 'still'));
check('a wheel opened between kicks kicks back: pushed off, no damage, no bleed, and he says to wait for the kick', early.target === 'ogvalve' && early.bleed === 0 && early.moved > 0.25 && early.hpLost === 0 && early.said.some((l) => /Wait for the kick/.test(l)), early);
const b1 = await timed(() => T.wheel(1, 'kick'));
check('a wheel opened as it kicks bleeds the kick down the drain (1/3); Mira names the cost', b1.bleed === 1 && b1.said.some((l) => /water the shelters won't get/.test(l)), b1);
const b1v = await ev(() => T.view());
check('the objective counts the bleeds (1/3)', /\(1\/3\)/.test(b1v.obj), b1v.obj);

// Save → Continue in the middle of the hammer
await ev(() => game.save(false));
await reload();
const r1 = await ev(() => T.view());
console.log('reload mid-hammer:', JSON.stringify(r1));
check('Save → Continue mid-hammer: back in the valve room in chapter 10, the bleed kept (1/3), Mira there, the hammer running', r1.key === 'throttle' && r1.room === 'valves' && r1.bleed === 1 && r1.hammer === true && !!r1.mira && r1.state === 'play', r1);

const b23 = await timed(() => { const a = T.wheel(2, 'kick'); const b = T.wheel(3, 'kick'); for (let i = 0; i < 60; i++) game.step(0.05); return { a, b, ...T.view(), wheel4: game.rooms.valves.valves[3].open, said: window.__said.slice(-16) }; });
console.log('Oren:', JSON.stringify(b23));
check('the third bleed: the governor rings, Oren speaks (his name, Ballastra and the drill\'s stone, the people in the shelters by weight)', b23.steady && b23.said.some((l) => /n_oren: Oren\. I keep water still/.test(l)) && b23.said.some((l) => /On Ballastra.*drill rings an old stone/.test(l)) && b23.said.some((l) => /Sixty-one people in your two shelters/.test(l)), b23.said);
check('Mira tries wheel IV for the washroom; Oren turns it back ("Green holds"); it ends shut', b23.said.some((l) => /Green holds\. Above green, the old joints split/.test(l)) && b23.wheel4 === false, { wheel4: b23.wheel4 });
check("Oren's rings have risen out of the governor; the needles settle on green and stay; the hammer is over", b23.shown === 1 && Math.abs(b23.needle - 2) < 0.1 && b23.hammer === false && b23.govVisible === true, { shown: b23.shown, needle: b23.needle, hammer: b23.hammer });
const pres = await ev(() => { const ch = game.story.cur, g = ch.pres.group; let n = 0, lights = 0, transp = 0; g.traverse((o) => { if (o.isMesh) { n++; if (o.material.transparent) transp++; } if (o.isLight) lights++; }); const p0 = ch.pres.rings.map((r) => r.a); game.step(1.0); const p1 = ch.pres.rings.map((r) => r.a); return { meshes: n, lights, transp, turning: p0.map((a, i) => +(p1[i] - a).toFixed(3)) }; });
check("Oren's presence is cheap and his own: five meshes, no lights, no transparency; its rings turn at different rates", pres.meshes === 5 && pres.lights === 0 && pres.transp === 0 && new Set(pres.turning.map((x) => Math.sign(x) + ':' + Math.abs(x).toFixed(2))).size >= 3, pres);
const cost = await ev(() => { const ch = game.story.cur; const on = T.draws(); ch.gov.visible = false; ch.pres.group.visible = false; const off = T.draws(); ch.showGovernor(); return { on, off }; });
console.log('valve room draws (governor and rings shown / hidden):', JSON.stringify(cost));
check('the cost in the valve room: at most 14 more draw calls in one frame (main + shadow) with the governor and the rings', (cost.on.main + cost.on.shadow) - (cost.off.main + cost.off.shadow) <= 14, cost);

// Save → Continue after Oren
await ev(() => game.save(false));
await reload();
const r2 = await ev(() => { for (let i = 0; i < 20; i++) game.step(0.1); return T.view(); });
check('Save → Continue after Oren: the needles load on green, the rings are up, no hammer', r2.room === 'valves' && r2.steady && r2.shown === 1 && Math.abs(r2.needle - 2) < 0.1 && r2.hammer === false, r2);
const look = await timed(() => { const ch = game.story.cur, V = game.rooms.valves, c = V.group.position; const r = P.use(c.x + 5.15 - 0.2, c.z - 3.45 + 0.7, { near: 0.9 }); P.settle(); return { r: r.r, kind: r.target?.kind, said: window.__said.slice(-1) }; });
check('the governor can be inspected afterwards (BALANCE WORKS · BALLASTRA)', look.said.some((l) => /BALANCE WORKS · BALLASTRA/.test(l)), look);

// ---------------------------------------------------------------- the fortress shelter (walked): the chapter's end
// (OG-2: Baldino's call moved to the end of chapter 11, tests/oren-square.mjs; chapter 11 begins at this door)
const s3 = await timed(() => { const a = P.exitTo('valves-out'); const b = P.exitTo('outdoor-office'); const t = P.talk('gilbert', { run: true }); P.settle(); for (let i = 0; i < 30; i++) game.step(0.1); P.settle(); return { a: a.to, b: b.to, t, ...T.view(), og: { thanks: !!game.flags.og_thanks, done: !!game.flags.og_done }, cards: [...window.__cards], said: window.__said.slice(-10) }; });
console.log('the shelter:', JSON.stringify(s3));
check('walked out and up to the fortress shelter: Gilbert, Tim and Lulu thank him and Oren; no call from Baldino there', s3.t.r === 'talked' && s3.og.thanks && s3.og.done && s3.said.some((l) => /Oren, if you can hear this: thank you/.test(l)) && s3.said.some((l) => /slept right through/.test(l)) && !s3.said.some((l) => /Baldino\. The council's done its bit/.test(l)), s3);
check('the thanks end chapter 10: chapter 11 "Under the Well" begins at the same door (OG-2: Gilbert asks for his well)', s3.key === 'survey' && s3.cards.some((c) => /Chapter 11 · Under the Well/.test(c)) && s3.said.some((l) => /I want my well back/.test(l)), { key: s3.key, cards: s3.cards });
console.log(`OG-1 bot game time, the vote to chapter 11's start: ${played.toFixed(0)} s (${(played / 60).toFixed(1)} min; a floor: the bot walks A* routes and reads every line at once; not a first-time estimate)`);

// ---------------------------------------------------------------- other ways in
// a save from batch 1, standing in chapter 10 when it was an empty shell (the council chamber): resumes the chapter
await ev((F) => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 6, at: Date.now(), room: 'council', order: ['well', 'project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'evacuation', 'council', 'throttle', 'survey', 'ballastra', 'balances', 'network', 'shell', 'core', 'home'], hero: { x: 4844, z: 4.5, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { ...F, exp: 1, chapter: 9, chapterKey: 'throttle' }, killed: [], collected: [], searched: [], crates: [], loot: [] })); }, UP_TO_VOTE);
await reload();
const o1 = await ev(() => { P.settle(); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return T.view(); });
check('a chapter-10 save from batch 1 (the empty shell, in the council chamber) loads and plays the call and the flight home', o1.key === 'throttle' && o1.started && o1.arrived && o1.room === 'citadel' && o1.state === 'play', o1);
// a resume already on Citadel: no flight
await ev((F) => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 6, at: Date.now(), room: null, hero: { x: -36, z: -10, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { ...F, exp: 1, chapter: 9, chapterKey: 'throttle' }, killed: [], collected: [], searched: [], crates: [], loot: [] })); }, UP_TO_VOTE);
await reload();
const o2 = await ev(() => { P.settle(); for (let i = 0; i < 10; i++) game.step(0.1); P.settle(); return { ...T.view(), pos: [+game.hero.pos.x.toFixed(0), +game.hero.pos.z.toFixed(0)] }; });
check('a chapter-10 save already on Citadel resumes with the call and no flight (he stays where he was)', o2.key === 'throttle' && o2.started && o2.arrived && o2.room === 'citadel' && Math.abs(o2.pos[0] + 36) < 3 && /Water Office/.test(o2.obj), o2);
// the base campaign (a save that had reached the network before the expansion): no governor in the valve room
const b0 = await ev(() => { const G = game; Object.assign(G.flags, { exp_base: 1, chapterKey: 'network', chapter: 13, c10_started: true }); delete G.flags.exp; G.story.applyFlags(); const V = G.rooms.valves; G.story.applyFlags(); const ch = G.story.chapters.find((c) => c.key === 'throttle'); return { gov: ch.gov?.visible ?? 'none', col: ch.govCol?.enabled ?? 'none', shown: ch.pres?.shown ?? 'none', V: !!V }; });
check('the base campaign (exp_base) never shows the governor or the rings in the valve room', b0.gov === false && b0.col === false && !b0.shown, b0);

done();
await browser.close();
