// OPENING-TUT (P22, 14.11.2026) and OPENING-TUT-2 (P31, 15.11.2026: "there wasn't really a tutorial of the first stage;
// I just took the ball and went outside"): the opening at home as a playable tutorial. src/game/tutorial.js (the panel),
// story/openingsteps.js (the steps and Zoé's call), story/hometap.js, story/prologue.js. Driven by input
// (tests/lib/player.js: held and tapped keys, a faked gamepad), never by setting a step or a lesson; story flags are only
// read, except where a check says "reproduced" (a save written for the check).
//   A  a new player following the steps, keyboard (Classic, the default): the house (walk, the cupboard; Arthur's talk
//      and the dialogue's key hint; the kitchen tap; the door waits for the ball) · save half way and load · the yard:
//      Zoé calls · (TUT-MYSTERY: the skip and Zoé's one call: tests/tutor-targets.mjs R2) · Talk to Zoé · the inventory ·
//      the garden tap · the barrels (misses first) · Athletic and the jump over the project's pipe (a missed run first) ·
//      the yard done: the well's way open · in and out of the house mid-step · the optional arc after · out of magic
//   B  Show control tips off from the start: the goal lines stay, no key, every step by its key · tips on
//      again · an experienced player doing the yard out of order · three missed jumps: "close enough" · a remapped key ·
//      a faked gamepad (the step's keys in pad terms, the camera tip after the yard) · on to the well and the town's tips
//   C  saves: from the cup's days and from P22's build (no steps, free to leave, no tip) · this build's save mid-yard
//      (the steps resume; leaving lets the yard go with one call) · this build's save beyond the edge (let go, never pulled back)
// Prints PASS/FAIL per check (R7-VERDICTS). Captures: captures/opening-tut-2/*.jpg (looked at by hand, not judged here).
import { launch, open, menu, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const CAP = fileURLToPath(new URL('../captures/opening-tut-2/', import.meta.url));
mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { await ev(() => { game.renderer.render(); }); await page.screenshot({ path: CAP + n + '.jpg', type: 'jpeg', quality: 82, timeout: 180000 }); };
const T = () => ev(() => ({ tip: game.tutorial.shown, text: document.querySelector('#tip.show')?.textContent ?? null, done: [...game.tutorial.done].sort(), state: game.state, room: game.room?.id ?? 'out' }));
const newGame = async () => {
  await page.click('[data-act="new"]');
  if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
  await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
  await ev(() => { game.testFreeze = true; game.step(1.2); });
};
const cont = async () => {
  await page.reload(); await open(page, '?nocine'); await menu(page, 'continue');
  await page.waitForFunction(() => game.state === 'play', null, { timeout: 600000 });
  await ev(() => { game.testFreeze = true; game.step(1.2); });
  await helpers();
};
// shared page helpers
const helpers = () => ev(async () => {
  const inp = await import('./src/engine/input.js');   // (the same module the game uses: its live bindings)
  P.yardFirst = false;   // (this suite plays the yard's steps itself, and tests its edge: the harness's own errand off)
  window.TT = {
    code(a) { return inp.keyFor(a); },
    door() { return game.room.exits.find((x) => x.to === 'outdoor'); },
    out() { P.settle(); const e = TT.door(); const r = P.through(e.x, e.z); game.step(0.6); return r; },
    inside() { P.settle(); const d = game.world.houses[0].door; P.through(d.x, d.z); game.step(0.6); },
    labels(a) { return game.hud.key(a); },
    tip() { return document.querySelector('#tip.show')?.textContent || ''; },
    tipHas(...words) { const s = TT.tip(); return words.every((w) => s.includes(w)); },
    kbd() { return !!document.querySelector('#tip.show kbd'); },
    step() { return game.story.cur.steps.current(); },
    fromDoor() { const d = game.world.houses[0].door, p = game.hero.pos; return +Math.hypot(p.x - d.x, p.z - d.z).toFixed(1); },
    said() { return game.story.cur.steps.saidLog || []; },
    // the dialogue lines said (who, the text), from now on
    listen() { const L = (window.__said = []); if (!game.__sayHook) { const sy = game.say.bind(game); game.say = (n, l, d, sp, c) => { (window.__said || []).push([n, Array.isArray(l) ? l.join(' / ') : l]); return sy(n, l, d, sp, c); }; game.__sayHook = true; } return L; },
    // a player who tries to skip: heads straight for the well, by the keys (P.go steers with the arrows); the dialogue it
    // runs into is advanced with E, as a player does; returns how far he got and what was said
    skip() {
      const W = game.world.well, said = TT.listen(); let maxD = TT.fromDoor(), r;
      for (let k = 0; k < 2; k++) {
        r = P.go(W.x, W.z, { tol: 1.5, maxT: 25, stopWhen: () => { maxD = Math.max(maxD, TT.fromDoor()); return false; } });
        maxD = Math.max(maxD, TT.fromDoor());
        P.settle();
        for (let i = 0; i < 80 && game.state === 'cutscene'; i++) game.step(0.1);
        game.step(0.3);
      }
      return { r: r.r, maxD, endD: TT.fromDoor(), said: said.map((x) => x[1]), zoe: said.filter((x) => x[0] === 'n_zoe').length, room: game.room?.id ?? 'out', state: game.state, wellSeen: !!game.flags.wellSeen };
    },
    // the found box, then play
    settleFound() { for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(0.4); },
    tipBox() { const e = document.querySelector('#tip.show'); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left | 0, t: r.top | 0, r: r.right | 0, b: r.bottom | 0, mid: r.right < innerWidth * 0.4 }; },
    stars() { return (game.story.cur.markers() || []).map((m) => [+m.x.toFixed(1), +m.z.toFixed(1), m.label || '']); },
  };
});

// ============================================================ A: a new player following the steps (keyboard)
await open(page, '?nocine');
await newGame();
await helpers();
let s = await T();
const t0 = await ev(() => game.time);
check('A1 control at once in the house; one panel: the goal (the magic ball, the cupboard) and the walk keys (Classic: walk and turn)', s.tip === 'step:ball' && (await ev(() => TT.tipHas('Take your magic ball from the cupboard', TT.labels('up'), TT.labels('left'), TT.labels('right')))), s);
check('A1 the panel clear of the screen middle (Twinsen), the dialogue and the prompt', await ev(() => { const b = TT.tipBox(); return !!b && b.mid; }), await ev(() => TT.tipBox()));
await shot('01-house-goal');
await ev(() => { P.holdFor(['ArrowUp'], 1.1); game.step(0.4); });
s = await T();
check('A2 a short walk: the walk keys go, the goal stays', s.done.includes('move') && s.tip === 'step:ball' && !(await ev(() => TT.tipHas(TT.labels('up') + ' Walk'))), s);
// Arthur at his boat (optional): "Talk" only facing him in reach; the dialogue box teaches its key
const talk = await ev(() => {
  const a = P.npc('arthur'); P.go(a.pos.x + 1.1, a.pos.z - 1.1, { tol: 0.35 });
  const h = game.hero; h.angle = Math.atan2(h.pos.x - a.pos.x, h.pos.z - a.pos.z); game.step(0.6);   // (his back to him)
  const away = document.querySelector('#prompt.show')?.textContent || '';
  P.face(a.pos.x, a.pos.z); game.step(0.6);
  const facing = document.querySelector('#prompt.show')?.textContent || '';
  P.tap('KeyE', 0.05);
  const D = game.hud.dialog, typing = D.shown < D.full.length, k1 = document.querySelector('#dialog .tutkey')?.textContent;
  P.tap('KeyE', 0.05);   // (pressed while it types: the whole line, still in the dialogue)
  const whole = D.shown >= D.full.length && game.state === 'dialog', k2 = document.querySelector('#dialog .tutkey')?.textContent;
  return { away, facing, typing, k1, whole, k2, key: TT.labels('interact') };
});
check('A3 Arthur (optional): "Talk" facing him in reach, not with his back to him', /Talk/.test(talk.facing) && !/Talk/.test(talk.away) && talk.facing.includes(talk.key), talk);
check('A3 the dialogue box teaches its key: "Show all" while a line types (and it does), then "Next"', talk.typing && /Show all/.test(talk.k1) && talk.whole && /Next/.test(talk.k2) && talk.k1.includes(talk.key), talk);
await ev(() => P.settle());
const tap = await ev(() => { const H = game.story.chapters[0].home.parts.house; const r = P.use(H.spout.x, H.spout.z, { near: 1.2, kind: 'h_tap' }); return { lines: r.lines, tap: !!game.flags.pr_tap }; });
check('A4 the kitchen tap by hand (optional): dry, the knocking, Arthur heard it all morning', tap.tap && tap.lines >= 2, tap);
const door = await ev(() => { const e = TT.door(); P.through(e.x, e.z); P.settle(); return { room: game.room?.id, ball: game.hero.hasBall }; });
check('A5 the door before the ball: his line, still in the house', door.room === 'house' && !door.ball, door);
const near = await ev(() => { const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.go(sp.x, sp.z, { tol: 1.4 }); game.step(0.8); return TT.tip(); });
check('A6 by the cupboard: the panel names the key for it ("Search the cupboard")', near.includes('Search the cupboard') && near.includes(await ev(() => TT.labels('interact'))), near);
await shot('02-house-cupboard');
const ball = await ev(() => { const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z); TT.settleFound(); game.step(1.2); return { ball: game.hero.hasBall, tip: game.tutorial.shown, text: TT.tip() }; });
check('A6 the cupboard gives the ball; the next goal: out to the yard (no inventory tip in the house)', ball.ball && ball.tip === 'step:out' && /Go out to the yard/.test(ball.text), ball);
// save half way, reload, Continue
await ev(() => game.save(false));
await cont();
s = await T();
check('A7 saved half way and loaded: in the house with the ball, the same goal, Move still learned', s.room === 'house' && s.tip === 'step:out' && s.done.includes('move') && (await ev(() => game.hero.hasBall)), s);
const out = await ev(() => { const r = TT.out(); game.step(1.0); const z = P.npc('zoe'), h = game.hero; const v = z.pos.clone(); v.y += 1; v.project(game.camera); return { to: r.to, zoe: +Math.hypot(z.pos.x - h.pos.x, z.pos.z - h.pos.z).toFixed(1), zoeIn: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1, tip: game.tutorial.shown, text: TT.tip(), said: TT.said(), bark: document.querySelector('.zoebark')?.style.display, stars: TT.stars() }; });
check('A8 out of the door: Zoé a few steps off, in view, calls him over (her word over her head)', out.to === 'citadel' && out.zoe < 7 && out.zoeIn && out.said.includes('t2_zoe_call') && out.bark === 'block', out);
check('A8 the panel: Talk to Zoé, with the talk key; the map\'s star on her, not on the well', out.tip === 'step:zoe' && out.text.includes('Talk to Zoé') && out.text.includes(await ev(() => TT.labels('interact'))) && out.stars.length === 1 && out.stars[0][2] === 'Zoé', out);
await shot('03-yard-zoe-calls');
// (A9, a player who heads for the well first: TUT-MYSTERY, 20.11 — no call back any more; leaving ends the yard's steps
//  with one call from Zoé: tests/tutor-targets.mjs route R2. Not here: it would end the steps this part goes through)
const zoe = await ev(() => { const r = P.talk('zoe'); TT.settleFound(); game.step(0.3); const ok = TT.tip(); game.step(1.4); return { kettle: !!game.flags.pr_kettle, ok, tip: game.tutorial.shown, text: TT.tip(), item: game.story.cur.items().some((i) => i.id === 'kettle') }; });
check('A10 Talk to Zoé by its key: their kettle, the crystals found; a tick, then: Look at the Kettle Crystals in your inventory, with its key', zoe.kettle && zoe.item && /✓ Talk to Zoé/.test(zoe.ok) && zoe.tip === 'step:inv' && zoe.text.includes(await ev(() => TT.labels('inventory'))), zoe);
await shot('05-yard-inventory-step');
const inv = await ev(() => { P.tap(TT.code('inventory'), 0.3); const st = game.state, foot = document.querySelector('#inventory .inv-hint')?.textContent; return { st, foot, sel: game.inventory.current()?.id }; });
check('A11 the inventory opens on its key, on the Kettle Crystals she asked about (the footer says how to close)', inv.st === 'inventory' && inv.sel === 'kettle' && /close/.test(inv.foot || ''), inv);
await shot('06-inventory-kettle');
const inv2 = await ev(() => { P.tap(TT.code('inventory'), 0.3); game.step(1.6); game.step(1.0); return { st: game.state, tip: game.tutorial.shown, text: TT.tip(), said: TT.said() }; });
check('A11 closed: the next goal, Try the garden tap, with its key; Zoé asks', inv2.st === 'play' && inv2.tip === 'step:tap' && /Try the garden tap/.test(inv2.text) && inv2.said.includes('t2_ask_tap'), inv2);
const ytap = await ev(() => { const Y = game.story.chapters[0].home.parts.yard; P.use(Y.x, Y.z, { near: 1.2, kind: 'h_yard' }); P.settle(); game.step(2.6); return { yard: !!game.flags.pr_yard, tip: game.tutorial.shown, text: TT.tip(), said: TT.said() }; });
check('A13 the garden tap by its key: dry, knocking; then: Hit the barrels with the magic ball, in its key; Zoé\'s dare', ytap.yard && ytap.tip === 'step:barrels' && ytap.text.includes(await ev(() => TT.labels('ball'))) && ytap.said.includes('t2_ask_barrels'), ytap);
await ev(() => { P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); P.go(-45.3, 73.0, { tol: 0.4 }); game.step(0.6); });
await shot('07-yard-barrels-step');
const misses = await ev(() => {
  const B = game.story.cur.barrels(), times = [];
  for (let i = 0; i < 2; i++) { P.face(B.x + 6, B.z - 20); const t1 = game.time; P.tap(TT.code('ball'), 0.05); let k = 0; while (game.ball.state === 'idle' && k++ < 30) game.step(1 / 30); while (game.ball.state !== 'idle' && game.time - t1 < 8) game.step(1 / 30); times.push(+(game.time - t1).toFixed(2)); }
  game.step(0.6);
  return { times, hit: !!game.flags.pr_barrel, tip: game.tutorial.shown };
});
check('A14 two throws away from the barrels: back in his hand each time within 3.5 s, nothing hit, the step stays', misses.times.every((x) => x < 3.5) && !misses.hit && misses.tip === 'step:barrels', misses);
const hit = await ev(() => { const B = game.story.cur.barrels(); P.face(B.x, B.z); P.tap(TT.code('ball'), 0.05); game.step(1.0); const ok = TT.tip(); game.step(1.0); P.settle(); game.step(1.4); return { hit: !!game.flags.pr_barrel, ok, ball: game.ball.state, tip: game.tutorial.shown, text: TT.tip(), said: TT.said() }; });
check('A14 facing them, one throw: a hit (flash, knock, his word), a tick; then: Jump over the project\'s pipe, Switch to Athletic in its key', hit.hit && hit.ball === 'idle' && hit.tip === 'step:pipe' && hit.text.includes(await ev(() => TT.labels('b2'))) && /Athletic/.test(hit.text) && hit.said.includes('t2_ask_pipe'), hit);
await ev(() => { P.go(-45.0, 69.6, { tol: 0.4 }); game.step(0.6); });
await shot('08-yard-pipe-step');
const miss = await ev(() => { const h = game.hero; P.face(-40, 69.6); const hp = h.hp; game.input.keys.add('ArrowUp'); game.step(1.6); game.input.keys.delete('ArrowUp'); game.step(0.4); return { x: +h.pos.x.toFixed(2), hp: h.hp, hp0: hp, pipe: !!game.flags.pr_pipe }; });
check('A15 walking into the pipe in Normal: stopped on his side, no harm, the step stays', miss.x < -43.7 && miss.hp === miss.hp0 && !miss.pipe, miss);
const ath = await ev(() => { P.tap(TT.code('b2'), 0.2); game.step(0.6); return { beh: game.hero.behaviour, text: TT.tip() }; });
check('A16 switched to Athletic by its key: the panel\'s key moves on to the jump', ath.beh === 'athletic' && ath.text.includes(await ev(() => TT.labels('action'))) && /Jump/.test(ath.text), ath);
await shot('09-yard-jump-key');
const jump = await ev(() => { const h = game.hero; P.go(-46.4, 70.6, { tol: 0.3, run: true }); P.settle(); P.face(-40, 70.6); game.input.keys.add('ArrowUp'); game.step(0.45); P.tap('Space', 0.02); game.step(1.0); game.input.keys.delete('ArrowUp'); game.step(0.4); const ok = TT.tip(); game.step(1.6); return { x: +h.pos.x.toFixed(2), pipe: game.flags.pr_pipe, ok, yardOk: !!game.flags.pr_yardOk, said: TT.said(), tip: game.tutorial.shown, obj: document.querySelector('#pause-objective').textContent, stars: TT.stars(), well: [game.world.well.x, game.world.well.z] }; });
check('A17 the running jump clears the pipe: a tick, Zoé\'s last word; the yard is done', jump.x > -43.2 && jump.pipe === 1 && jump.yardOk && jump.said.includes('t2_zoe_done'), jump);
check('A17 the objective is the well again, and the map\'s star is on it', /Check the well/.test(jump.obj) && !/Talk to|Try the|Hit the|Jump over/.test(jump.obj) && jump.stars.some((m) => m[0] === jump.well[0] && m[1] === jump.well[1]), jump);
await shot('10-yard-done');
const yardT = await ev((a) => +(game.time - a).toFixed(1), t0);
check('A17 (timing, the bot) the house and the yard by the steps, two skip attempts and the optional Arthur and tap included: under 4 minutes of game time', yardT < 240, { seconds: yardT });
// in and out of the house: the step shows inside as "go out", outside again as it was (reproduced with a fresh step: the
// arc, the yard's one optional lesson left, is checked instead here: in the house no yard tip)
// (TUT-MYSTERY: with no skip attempts before it, the walk back passes the lane's pipe for the first time here: its
//  remark, prh_lane, is read as a player would, then on to the barrels)
const arc = await ev(() => { P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); P.go(-45.3, 73.0, { tol: 0.4 }); game.step(1.4); const tip = game.tutorial.shown; const B = game.story.cur.barrels(); P.face(B.x, B.z); game.input.keys.add(TT.code('ball')); game.step(0.8); const dots = game.ball.dots.some((d) => d.visible) || game.ball.landMark.visible; game.input.keys.delete(TT.code('ball')); game.step(2.4); P.settle(); return { tip, dots, done: game.tutorial.done.has('arc') }; });
check('A18 after the yard, the optional arc tip by the barrels; holding the ball key shows the landing (learned on the hold)', arc.tip === 'arc' && arc.dots && arc.done, arc);
const free = await ev(() => TT.skip());
check('A19 the yard done: the way to the well is open (no call), the well reached', free.zoe === 0 && free.maxD > 30 && free.wellSeen === false && free.r !== 'stuck', free);
const magic = await ev(() => {
  const W = game.world.well; const u = P.use(W.x, W.z, { near: 1.8, kind: 'well' }); P.settle();
  return { seen: !!game.flags.wellSeen };
});
check('A19 the well inspected (the story goes on)', magic.seen, magic);

// ============================================================ B: tips off, out of order, close enough, remap, gamepad
await page.reload(); await open(page, '?nocine');
await page.click('[data-act="settings"]'); await page.click('#settings [data-tab="controls"]'); await page.click('.seg[data-setting="tips"] button[data-v="off"]'); await page.click('#settings [data-act="back"]');
check('B0 Settings has "Show control tips"; Off is kept', await ev(() => game.settings.tips === 'off' && !!document.querySelector('.seg[data-setting="tips"]')), await ev(() => game.settings.tips));
await newGame(); await helpers();
const off = await ev(() => {
  const seen = []; const watch = (k) => seen.push([k, TT.tip(), TT.kbd(), !!document.querySelector('#dialog .tutkey')]);
  watch('house'); P.holdFor(['ArrowUp'], 0.6);
  P.talk('arthur'); watch('arthur');
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z); TT.settleFound(); game.step(1); watch('ball');
  TT.out(); game.step(1); watch('out');
  P.talk('zoe'); TT.settleFound(); game.step(1.6); watch('zoe');
  P.tap(TT.code('inventory'), 0.3); P.tap(TT.code('inventory'), 0.3); game.step(1.6); watch('inv');
  const Y = game.story.chapters[0].home.parts.yard; P.use(Y.x, Y.z, { near: 1.2, kind: 'h_yard' }); P.settle(); game.step(1.6); watch('tap');
  P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); const B = game.story.cur.barrels(); P.face(B.x, B.z); P.tap(TT.code('ball'), 0.05); game.step(2.0); P.settle(); game.step(1.6); watch('barrels');
  P.tap(TT.code('b2'), 0.2); P.go(-46.4, 70.6, { tol: 0.3, run: true }); P.settle(); P.face(-40, 70.6); game.input.keys.add('ArrowUp'); game.step(0.45); P.tap('Space', 0.02); game.step(1.0); game.input.keys.delete('ArrowUp'); game.step(2.0); watch('pipe');
  return { seen, flags: ['pr_kettle', 'pr_yard', 'pr_barrel', 'pr_pipe', 'pr_yardOk'].map((k) => !!game.flags[k]) };
});
const goals = off.seen.filter((x) => x[0] !== 'pipe').map((x) => x[1]);
check('B1 tips off: the goal line stays at every step, with no key in it, and no dialogue key hint', off.seen.every((x) => !x[2] && !x[3]) && goals.every((g) => g.length > 0) && /Talk to Zoé/.test(off.seen[3][1]) && /Kettle Crystals/.test(off.seen[4][1]), off.seen);
check('B1 tips off: every step completes by its key (kettle, tap, barrels, pipe; the yard done)', off.flags.every(Boolean), { flags: off.flags });
await shot('11-tips-off');
// tips on again (from pause): only the steps' keys come back; nothing else asked (a fresh game for the panel's keys)
await ev(() => { game.settings.tips = 'on'; game.applySettings?.(); game.step(1.0); });
// B2 an experienced player out of order: the barrels and the pipe before talking to Zoé; the steps done are skipped
await page.reload(); await open(page, '?nocine'); await newGame(); await helpers();
const exp = await ev(() => {
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z); TT.settleFound(); game.step(0.6); TT.out(); game.step(0.6);
  P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); const B = game.story.cur.barrels(); P.face(B.x, B.z); P.tap(TT.code('ball'), 0.05); game.step(2.0); P.settle();
  P.tap(TT.code('b2'), 0.2); P.go(-46.4, 70.6, { tol: 0.3, run: true }); P.settle(); P.face(-40, 70.6); game.input.keys.add('ArrowUp'); game.step(0.45); P.tap('Space', 0.02); game.step(1.0); game.input.keys.delete('ArrowUp'); game.step(0.6);
  const mid = game.tutorial.shown;
  P.talk('zoe'); TT.settleFound(); game.step(1.6); const afterZoe = game.tutorial.shown;
  P.tap(TT.code('inventory'), 0.3); P.tap(TT.code('inventory'), 0.3); game.step(1.6); const afterInv = game.tutorial.shown;
  return { barrel: !!game.flags.pr_barrel, pipe: game.flags.pr_pipe, mid, afterZoe, afterInv, said: TT.said() };
});
check('B2 an experienced player out of order (the barrels and the pipe first): those count; after Zoé and the inventory only the tap is left', exp.barrel && exp.pipe === 1 && exp.mid === 'step:zoe' && exp.afterZoe === 'step:inv' && exp.afterInv === 'step:tap' && !exp.said.includes('t2_ask_barrels') && !exp.said.includes('t2_ask_pipe'), exp);
// B3 three missed jumps at the pipe: "close enough" (nothing can be failed)
await page.reload(); await open(page, '?nocine'); await newGame(); await helpers();
const close = await ev(() => {
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z); TT.settleFound(); TT.out(); game.step(0.6);
  P.talk('zoe'); TT.settleFound(); P.tap(TT.code('inventory'), 0.3); P.tap(TT.code('inventory'), 0.3); game.step(1);
  const Y = game.story.chapters[0].home.parts.yard; P.use(Y.x, Y.z, { near: 1.2, kind: 'h_yard' }); P.settle();
  P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); const B = game.story.cur.barrels(); P.face(B.x, B.z); P.tap(TT.code('ball'), 0.05); game.step(2.0); P.settle();
  P.tap(TT.code('b2'), 0.2); P.go(-45.2, 69.6, { tol: 0.3, run: true }); P.settle();   // (standing jumps beside the pipe: up and down on his side)
  const tries = [];
  for (let i = 0; i < 3; i++) { P.face(-40, 69.6); P.tap('Space', 0.02); game.step(1.4); tries.push([game.flags.pr_pipe || 0, +game.hero.pos.x.toFixed(2)]); }
  game.step(1.6);
  return { tries, pipe: game.flags.pr_pipe, yardOk: !!game.flags.pr_yardOk, said: TT.said() };
});
check('B3 three standing jumps at the pipe that don\'t clear it: "Close enough"; the yard done', close.pipe === 2 && close.yardOk && close.said.includes('t2_zoe_close') && close.tries[0][0] === 0, close);
// B4 a remapped key mid-step: the panel names the new key at once (a fresh game at the barrels' step)
await page.reload(); await open(page, '?nocine'); await newGame(); await helpers();
await ev(() => {
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z); TT.settleFound(); TT.out(); game.step(0.6);
  P.talk('zoe'); TT.settleFound(); P.tap(TT.code('inventory'), 0.3); P.tap(TT.code('inventory'), 0.3); game.step(1);
  const Y = game.story.chapters[0].home.parts.yard; P.use(Y.x, Y.z, { near: 1.2, kind: 'h_yard' }); P.settle(); P.go(-45.3, 73.0, { tol: 0.4 }); game.step(1.2);
});
await ev(() => game.pause());
await page.click('#pause [data-act="controls"]');
await page.click('#rebind .keybtn[data-action="ball"]'); await page.keyboard.press('KeyG');
await page.click('#controls [data-act="back"]'); await page.click('#pause [data-act="resume"]');
await ev(() => { game.testFreeze = true; game.step(1.0); });
const remap = await ev(() => ({ key: TT.labels('ball'), text: TT.tip(), tip: game.tutorial.shown }));
check('B4 a remapped key: the barrels\' step names the new key at once', remap.tip === 'step:barrels' && remap.key === 'G' && /\bG\b/.test(remap.text), remap);
await shot('12-remapped');
// B5 a faked gamepad (the standard mapping) mid-step: the step's keys in its buttons; the throw by Y completes it
await ev(() => {
  const btn = () => ({ pressed: false, value: 0 });
  window.__pad = { connected: true, id: 'test pad', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
  navigator.getGamepads = () => [window.__pad];
  window.__pad.axes[0] = 0.5; game.step(0.1); window.__pad.axes[0] = 0; game.step(1.0);
});
const pad = await ev(() => ({ dev: game.input.lastDevice, tip: game.tutorial.shown, text: TT.tip(), cam: game.settings.camera }));
check('B5 a gamepad mid-step: the step\'s key in the pad\'s terms (left stick, Y)', pad.dev === 'pad' && pad.tip === 'step:barrels' && /\bY\b/.test(pad.text) && /left stick/.test(pad.text), pad);
await shot('13-pad-step');
const padThrow = await ev(() => { const B = game.story.cur.barrels(); P.face(B.x, B.z); window.__pad.buttons[3].pressed = true; game.step(1 / 30); window.__pad.buttons[3].pressed = false; let thrown = false; for (let i = 0; i < 30; i++) { game.step(1 / 30); thrown ||= game.ball.state === 'fly'; } game.step(2.4); P.settle(); game.step(1.4); return { thrown, hit: !!game.flags.pr_barrel, ball: game.ball.state, tip: game.tutorial.shown, text: TT.tip() }; });
check('B6 the pad\'s Y throws and hits: the next step in the pad\'s terms (Athletic on the D-pad)', padThrow.thrown && padThrow.hit && padThrow.tip === 'step:pipe' && /D-pad/.test(padThrow.text), padThrow);
const back = await ev(() => { game.input.keys.add('ArrowLeft'); game.input.lastDevice = 'kbd'; game.step(0.3); game.input.keys.delete('ArrowLeft'); navigator.getGamepads = () => []; game.step(0.6); return { dev: game.input.lastDevice, text: TT.tip() }; });
check('B7 back to the keyboard mid-step: no pad button left in the panel', back.dev === 'kbd' && !/\b(Y|View|Left stick|Right stick|D-pad)\b/.test(back.text), back);
// B8 the yard done (the pipe by keys), then the camera tip for a pad's Free camera; on to the well, the town's tips
const fin = await ev(() => { P.tap(TT.code('b2'), 0.2); P.go(-46.4, 70.6, { tol: 0.3, run: true }); P.settle(); P.face(-40, 70.6); game.input.keys.add('ArrowUp'); game.step(0.45); P.tap('Space', 0.02); game.step(1.0); game.input.keys.delete('ArrowUp'); game.step(2.0); return { ok: !!game.flags.pr_yardOk }; });
check('B8 the pipe by keys: the yard done', fin.ok, fin);
const well = await ev(() => { const W = game.world.well; let r; for (let k = 0; k < 4; k++) { r = P.go(W.x + 2.6, W.z + 0.4, { tol: 0.8, run: true, maxT: 200 }); P.settle(); if (r.r === 'arrived') break; } game.step(1.0); const tips = new Set(); for (let i = 0; i < 6; i++) { game.step(0.3); if (game.tutorial.shown) tips.add(game.tutorial.shown); } P.use(W.x, W.z, { near: 1.8, kind: 'well' }); return { r: r.r, tips: [...tips], seen: !!game.flags.wellSeen }; });
check('B9 on to the well: no yard step or tip in town, the well inspected', well.seen && !well.tips.some((x) => /^step:|ball|athletic|jump|inventory/.test(x)), well);
await shot('14-well');
const kids = await ev(() => {
  P.talk('tim', { run: true }); P.settle(); game.step(1.2);
  const t1 = TT.tip(); P.tap('F4', 0.2); game.step(0.4);
  const k = P.npc('tim'), h = game.hero;
  for (let i = 0; i < 120 && !game.flags.overheard; i++) { P.face(k.pos.x, k.pos.z, 0.2); game.input.keys.add('ArrowUp'); game.step(0.1); game.input.keys.delete('ArrowUp'); if (h.distTo(k) < 1.6) break; }
  P.settle(); game.step(1.2);
  const t2 = TT.tip(); P.tap('F1', 0.2); game.step(0.4);
  return { t1, t2, overheard: !!game.flags.overheard, done: ['discreet', 'normal'].filter((x) => game.tutorial.done.has(x)) };
});
check('B10 the kids brush him off: Switch to Discreet; overheard, then Back to Normal; both learned', /Discreet/.test(kids.t1 || '') && kids.overheard && /Normal/.test(kids.t2 || '') && kids.done.length === 2, kids);
const kick = await ev(() => { const f = game.flags, W = game.world.well; f.key = true; f.pr_lidStuck = true; game.hero.hasKey = true; game.story.cur.setLid('stuck'); P.go(W.x + 2.4, W.z + 0.4, { tol: 0.5 }); game.step(1.2); const t1 = TT.tip(); P.tap('F3', 0.2); game.step(1.0); const t2 = TT.tip(); return { t1, t2 }; });
check('B11 (reproduced: flags set) at the stuck lid: Switch to Aggressive, then the kick\'s key', /Aggressive/.test(kick.t1 || '') && /Kick the lid/.test(kick.t2 || ''), kick);

// ============================================================ C: saves
// C1 a save from the cup's days, in the house after the tap, the cup not moved, no tutorial state, no steps
await ev(() => {
  const s0 = game.snapshot(); delete s0.tut;
  s0.room = 'house'; s0.hero.x = game.rooms.house.npcSpots.twinsen.x; s0.hero.z = game.rooms.house.npcSpots.twinsen.z; s0.hero.hasBall = false;
  s0.searched = (s0.searched || []).filter((k) => k !== 'cupboard');
  for (const k of ['pr_tut2', 'pr_pipe', 'pr_yardOk', 'overheard', 'kidsAsked', 'timConfessed']) delete s0.flags[k];
  Object.assign(s0.flags, { pr_v2: 1, pr_tap: true, pr_cup: false, pr_zoeOut: false, key: false, pr_lidStuck: false, pr_lidOpen: false, wellSeen: false, pr_kettle: false, pr_yard: false, pr_barrel: false });
  localStorage.setItem('lba3_save_v1', JSON.stringify(s0));
});
await cont();
const c1 = await ev(() => {
  const tip = game.tutorial.shown; const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z); TT.settleFound(); game.step(1);
  const r = TT.out(); const z = P.npc('zoe'); const tipOut = game.tutorial.shown; const sk = TT.skip();
  return { tip, ball: game.hero.hasBall, to: r.to, zoe: +Math.hypot(z.pos.x - game.hero.pos.x, z.pos.z - game.hero.pos.z).toFixed(1), tipOut, sk, steps: !!game.story.cur.steps.on };
});
check('C1 a save from the cup\'s days (no tutorial state, no steps): no tip, no step; ball, door; free to walk to the well (no call)', !c1.tip && c1.ball && c1.to === 'citadel' && !c1.tipOut && !c1.steps && c1.sk.zoe === 0 && c1.sk.maxD > 30, c1);
// C2 a save from P22's build: tutorial state v1 (move, inventory learned), pr_v2, in the yard, nothing of the yard done
await ev(() => {
  const s0 = game.snapshot(); s0.tut = { v: 1, done: ['move', 'inventory', 'talk', 'use', 'advance'], gone: [] };
  for (const k of ['pr_tut2', 'pr_pipe', 'pr_yardOk', 'wellSeen']) delete s0.flags[k];
  Object.assign(s0.flags, { pr_v2: 1, pr_kettle: false, pr_yard: false, pr_barrel: false });
  s0.room = null; s0.hero.x = -44.8; s0.hero.z = 74.5; s0.hero.hasBall = true;
  localStorage.setItem('lba3_save_v1', JSON.stringify(s0));
});
await cont();
const c2 = await ev(() => { game.step(1.0); const tip = game.tutorial.shown; const sk = TT.skip(); return { state: game.state, tip, steps: !!game.story.cur.steps.on, sk }; });
check('C2 a save from P22\'s build in the yard (no pr_tut2): plays on as before: no step, no call, free to leave', c2.state === 'play' && !/^step:/.test(c2.tip || '') && !c2.steps && c2.sk.zoe === 0 && c2.sk.maxD > 30, c2);
// C3 this build's save mid-yard (the kettle and the inventory done): Continue resumes at the tap; leaving lets the yard
// go with Zoé's one call (TUT-MYSTERY: no call back)
await ev(() => {
  const s0 = game.snapshot(); s0.tut = { v: 1, done: ['move', 'inventory', 'talk', 'use', 'advance'], gone: [] };
  for (const k of ['pr_pipe', 'pr_yardOk', 'wellSeen']) delete s0.flags[k];
  Object.assign(s0.flags, { pr_v2: 1, pr_tut2: 1, pr_kettle: true, pr_yard: false, pr_barrel: false });
  s0.room = null; s0.hero.x = -44.8; s0.hero.z = 74.5; s0.hero.hasBall = true;
  localStorage.setItem('lba3_save_v1', JSON.stringify(s0));
});
await cont();
const c3 = await ev(() => { game.step(1.0); const tip = game.tutorial.shown, text = TT.tip(); const sk = TT.skip(); return { tip, text, sk }; });
check('C3 this build\'s save mid-yard: the steps resume where they were (Try the garden tap); leaving: one call, no walk back', c3.tip === 'step:tap' && c3.sk.maxD > 30 && c3.sk.zoe === 0 && (await ev(() => game.story.cur.steps.saidLog || [])).includes('t2_call_go') && (await ev(() => !!game.flags.pr_yardOk)), c3);
// C4 this build's save somehow past the yard's edge (in the square): let go, never pulled back
await ev(() => {
  const s0 = game.snapshot();
  for (const k of ['pr_pipe', 'pr_yardOk', 'wellSeen']) delete s0.flags[k];
  Object.assign(s0.flags, { pr_v2: 1, pr_tut2: 1, pr_kettle: true, pr_yard: false, pr_barrel: false });
  s0.room = null; s0.hero.x = game.world.well.x + 4; s0.hero.z = game.world.well.z + 3; s0.hero.hasBall = true;
  localStorage.setItem('lba3_save_v1', JSON.stringify(s0));
});
await cont();
const c4 = await ev(() => { game.step(1.0); const d = TT.fromDoor(); const W = game.world.well; P.go(W.x - 6, W.z - 4, { tol: 1, maxT: 20 }); P.settle(); return { d, d2: TT.fromDoor(), yardOk: !!game.flags.pr_yardOk, state: game.state, tip: game.tutorial.shown, said: (window.__said || []).length }; });
check('C4 this build\'s save past the yard\'s edge: let go (the yard counts as done), no call, no step', c4.yardOk && c4.state === 'play' && !/^step:/.test(c4.tip || '') && c4.d2 > 40, c4);

await browser.close();
done();
