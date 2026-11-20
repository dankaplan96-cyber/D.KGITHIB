// TUTOR-TARGETS (P67, 18.11.2026) and TUT-MYSTERY (REVIEW-TASKS-19-11 task 4, 20.11.2026): the opening's yard as part of
// the water mystery, played by input in three routes (the user, 20.11: one focused test; the full suites at the end).
//   R1 a beginner following each cue: the panel, the world's gold marker and the map's star on the same thing at every
//      step (none on the inventory's step); the garden tap's knock answered from behind the near barrel (it rocks, Zoé
//      looks); a shove by hand gets a word; the ball knocks the barrel aside and shows the joint; the pipe jumped; no
//      call back, no walk back; on to the well. The where line, Zoé's reminder, the edge arrow, tips Off, the Hebrew.
//   R2 a returning player: the barrels first (counts: the joint), then straight for the well: Zoé calls once (her name
//      at the screen's edge), control stays, nothing granted for what he skipped; the well, Mira wants proof, back to Zoé
//      for the kettle, the key.
//   R3 a reload halfway through the yard: the step, the marker and the barrel's place come back; after the knock, saved
//      and loaded again, the barrel stays aside; the pipe walked round, the yard let go with one call. A save written as
//      the build before TUT-MYSTERY would have (pr_tut2 mid-yard, the barrels hit) loads and plays on.
// src/game/tutorial.js (mark, arrow), story/openingsteps.js, story/hometap.js, story/prologue.js (revealJoint).
// Captures: captures/tutor-targets/*.jpg (the normal follow camera).
import { launch, open, menu, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const CAP = fileURLToPath(new URL('../captures/tutor-targets/', import.meta.url));
mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { await ev(() => { game.renderer.render(); }); await page.screenshot({ path: CAP + n + '.jpg', type: 'jpeg', quality: 82, timeout: 180000 }); };
// what the player is shown now: the step, the world marker (its thing and place), the map's stars, the panel, the arrow
const M = () => ev(() => {
  const tu = game.tutorial, T = tu.markAt, mk = tu._mk, c = mk?.cone.position, ch = game.story.cur;
  const ar = document.getElementById('tiparrow');
  return { step: ch.steps?.current?.() ?? null, name: T?.name ?? null, at: T ? [+T.x.toFixed(1), +T.z.toFixed(1)] : null,
    vis: !!mk?.group.visible, cone: c ? [+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1)] : null,
    stars: (ch.markers() || []).map((m) => [+m.x.toFixed(1), +m.z.toFixed(1), m.label || '']),
    arrow: ar && ar.style.display === 'block' ? ar.textContent : null, tip: document.querySelector('#tip.show')?.textContent || '' };
});
const near = (a, b, d) => !!a && !!b && Math.hypot(a[0] - b[0], a[1] - b[1]) < d;
// the panel, the marker and the star agree (the star where the marker is, or neither)
const agree = (s) => (s.vis ? s.stars.length === 1 && near(s.at, s.stars[0], 0.3) : s.stars.length === 0);
const newGame = async () => {
  await page.click('[data-act="new"]');
  if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
  await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
  await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });
};
const cont = async () => {
  await page.reload(); await open(page, '?nocine'); await menu(page, 'continue');
  await page.waitForFunction(() => game.state === 'play', null, { timeout: 600000 });
  await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });
};
// page helpers: the ball from the cupboard and out of the door; the found box; a watch on cutscenes (the old walk back)
const helpers = () => ev(() => {
  window.TM = {
    found() { for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } },
    ballOut() { const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.go(sp.x, sp.z, { tol: 1.2 }); P.use(sp.x, sp.z); TM.found(); game.step(1.2); },
    out() { const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); P.settle(); game.step(1.0); },
    // the dialogue lines from now on (who, key text), and how often the game went into a cutscene
    listen() { window.__said = []; window.__cut = 0; if (!game.__tmHook) { game.__tmHook = true; const sy = game.say.bind(game); game.say = (n, l, d, sp, c) => { window.__said.push([n, Array.isArray(l) ? l.join(' / ') : l]); return sy(n, l, d, sp, c); }; const ss = game.setState.bind(game); game.setState = (s) => { if (s === 'cutscene') window.__cut++; return ss(s); }; } },
    said() { return (window.__said || []).map((x) => x[1]); },
    fromDoor() { const d = game.world.houses[0].door, p = game.hero.pos; return +Math.hypot(p.x - d.x, p.z - d.z).toFixed(1); },
    barrel() { const R = game.story.cur.home.parts.barrel; return { aside: R.aside, at: [+R.B.grp.position.x.toFixed(2), +R.B.grp.position.z.toFixed(2)], col: [+R.B.c.x.toFixed(2), +R.B.c.z.toFixed(2)], x0: R.x0, z0: R.z0 }; },
    throwAtBarrels() { const B = game.story.cur.barrels(); if (game.hero.behaviour === 'athletic') P.tap('F1'); P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); P.face(B.x, B.z); P.tap('KeyF', 0.05); for (let i = 0; i < 40 && game.state === 'play'; i++) game.step(0.1); P.settle(); game.step(1.0); },
    // walk to the well as a player does: a remark on the way (the lane's knock) is read, and he walks on
    toWell(stopWhen) { const W = game.world.well; let r; for (let k = 0; k < 4; k++) { r = P.go(W.x, W.z, { tol: 2.5, maxT: 200, stopWhen }); P.settle(); if (r.r !== 'state:dialog') break; } return r; },
  };
});
const S = (k) => ev((k) => STR_EN[k], k).catch(() => null);
await open(page, '?nocine');
await ev(async () => { const { STR } = await import('./src/game/i18n.js'); window.STR_EN = STR.en; });

// ============================================================ R1 a beginner following each cue
await newGame(); await helpers();
let s = await M();
const cup = await ev(() => { const c = game.room.cupboard; return [+c.x.toFixed(1), +c.z.toFixed(1)]; });
check('R1.1 the house: the marker over the cupboard itself, named Cupboard; no star outdoors for it', s.step === 'ball' && s.vis && s.name === 't2_n_ball' && near(s.at, cup, 0.1) && s.stars.length === 0, s);
await ev(() => TM.ballOut());
s = await M();
const door = await ev(() => { const e = game.room.exits.find((x) => x.to === 'outdoor'); return [+e.x.toFixed(1), +e.z.toFixed(1)]; });
check('R1.2 the ball found: the marker on the front door; no star (the door is in the house)', s.step === 'out' && s.vis && s.name === 't2_n_out' && near(s.at, door, 0.1) && s.stars.length === 0, s);
await ev(() => { TM.out(); TM.listen(); });
s = await M();
const zp = await ev(() => { const z = P.npc('zoe'); return [+z.pos.x.toFixed(1), +z.pos.z.toFixed(1)]; });
check('R1.3 out in the yard: Talk to Zoé; the marker and the star both on her', s.step === 'zoe' && /Talk to Zoé/.test(s.tip) && s.vis && s.name === 't2_n_zoe' && near(s.at, zp, 0.1) && agree(s), s);
await ev(() => { P.talk('zoe'); TM.found(); game.step(1.6); });
s = await M();
const report = await ev(() => TM.said().find((x) => /next door/.test(x)) || '');
check('R1.4 Zoé reports the neighbours\' tap (warm, three knocks, stopped) and gives the kettle (P81)', /knocked three times/.test(report) && (await ev(() => !!game.flags.pr_kettle)), report);
check('R1.5 the inventory step: no marker and no star (a key, not a place: the star used to sit on Zoé)', s.step === 'inv' && !s.vis && !s.arrow && s.stars.length === 0 && /inventory/.test(s.tip), s);
const inv = await ev(() => { P.tap('KeyI', 0.3); const sel = game.inventory.current?.()?.id; P.tap('KeyI', 0.3); P.settle(); game.step(1.6); return sel; });
s = await M();
const tapAt = await ev(() => { const Y = game.story.cur.home.parts.yard; return [+Y.x.toFixed(1), +Y.z.toFixed(1)]; });
check('R1.6 the inventory opens on the Kettle Crystals; then the tap step: the panel, the marker and the star on the garden standpipe', inv === 'kettle' && s.step === 'tap' && /garden tap by the front door/.test(s.tip) && s.vis && s.name === 't2_n_tap' && near(s.at, tapAt, 0.1) && agree(s), { inv, s });
await shot('01-yard-tap');
// left undone: the where line, then Zoé's reminder (the hint's clock)
await ev(() => game.step(16));
s = await M();
check('R1.7 a step left 15 s: the panel adds where the tap is (brass, stone foot, bucket)', /brass tap on a stone foot/.test(s.tip), s.tip);
const said = await ev(() => { game.step(21); return game.story.cur.steps.saidLog || []; });
check('R1.8 after 35 s: Zoé says which tap she means', said.includes('t2_hint_tap'), said);
// the tap tried: the knock answers from behind the near barrel; it rocks while his line is in the box; Zoé looks at it
const tap = await ev(() => {
  const Y = game.story.cur.home.parts.yard, R = game.story.cur.home.parts.barrel, z = P.npc('zoe');
  P.go(Y.hand.front.x, Y.hand.front.z, { tol: 0.3 }); P.settle(); P.face(Y.x, Y.z);
  const tg = P.target()?.kind; P.tap('KeyW', 0.05);
  for (let i = 0; i < 60 && game.state === 'play'; i++) game.step(0.05);
  const line = document.querySelector('#dialog')?.textContent || '';
  let rock = 0, look = false; for (let i = 0; i < 14; i++) { game.step(0.1); rock = Math.max(rock, Math.abs(R.B.grp.rotation.z - R.B.rz)); look ||= !!z.listenTo && Math.abs(z.listenTo.pos.x - R.x0) < 0.01; }
  return { tg, state: game.state, line, rock: +rock.toFixed(3), look };
});
await shot('02-tap-knock-barrel-rocks');
check('R1.9 the garden tap tried: dry; the knock answers from behind the barrels (his line says so), the near barrel visibly rocks, Zoé turns to it', tap.tg === 'h_yard' && tap.state === 'dialog' && /behind the barrels/.test(tap.line) && tap.rock > 0.03 && tap.look, tap);
await ev(() => { P.settle(); game.step(2.0); });
s = await M();
const nb = await ev(() => { const R = game.story.cur.home.parts.barrel; return [+R.x0.toFixed(1), +R.z0.toFixed(1)]; });
check('R1.10 the barrels step: the goal says knock the barrel aside; the marker and the star on the near barrel (in front of the joint); Zoé names the joint', s.step === 'barrels' && /barrel by the house aside/.test(s.tip) && s.vis && s.name === 't2_n_barrels' && near(s.at, nb, 0.1) && agree(s) && (await ev(() => game.story.cur.steps.saidLog.includes('t2_ask_barrels'))), s);
await shot('03-barrels-step');
// the arrow: the barrels off the screen (he walked a way up the lane, still in the yard)
const arr = await ev(() => { P.go(-44.6, 64.8, { tol: 0.6 }); P.settle(); game.step(0.5); const v = game.tutorial.markAt; const p = new game.camera.position.constructor(v.x, v.y, v.z).project(game.camera); return { onScreen: p.z < 1 && Math.abs(p.x) < 0.94 && Math.abs(p.y) < 0.9, arrow: document.getElementById('tiparrow')?.style.display, label: document.getElementById('tiparrow')?.textContent, d: TM.fromDoor(), ok: !!game.flags.pr_yardOk }; });
check('R1.11 the barrel off the screen → the edge arrow with its name; on the screen → no arrow (still in the yard)', !arr.ok && (arr.onScreen ? arr.arrow !== 'block' : (arr.arrow === 'block' && /Barrels/.test(arr.label))), arr);
await ev(() => { game.settings.tips = 'off'; game.step(0.5); });
s = await M();
check('R1.12 Show control tips Off: the goal line and the marker stay (only the keys go)', s.vis && /barrel by the house/.test(s.tip) && !(await ev(() => !!document.querySelector('#tip.show kbd'))), s);
await ev(() => { game.settings.tips = 'on'; });
// a reasonable wrong try: a shove by hand
const shove = await ev(() => { const R = game.story.cur.home.parts.barrel; const r = P.use(R.x0, R.z0, { near: 1.0, kind: 'h_barrel' }); const line = document.querySelector('#dialog')?.textContent || ''; P.settle(); return { r: r?.r, line, aside: R.aside, step: game.story.cur.steps.current() }; });
check('R1.13 a shove by hand: a useful word (the ball might move it), the barrel stays, the step stays', /knock with the ball/.test(shove.line) && !shove.aside && shove.step === 'barrels', shove);
// the ball: the barrel shuffles aside, the joint shows
await ev(() => { TM.listen(); TM.throwAtBarrels(); });
const knock = await ev(() => ({ b: TM.barrel(), said: TM.said(), f: !!game.flags.pr_barrel, step: game.story.cur.steps.current() }));
check('R1.14 the ball hits: the barrel is knocked a metre aside (its collider with it); his lines: the joint from yesterday held, warm, furred like the kettle; Zoé concedes; the trail leads to the square', knock.f && knock.b.aside && knock.b.at[1] < knock.b.z0 - 0.8 && Math.abs(knock.b.col[1] - knock.b.at[1]) < 0.01 && knock.said.some((x) => /joint from yesterday/.test(x)) && knock.said.some((x) => /fix worked/.test(x)) && knock.said.some((x) => /starts at the well/.test(x)), knock);
await ev(() => { const J = game.story.cur.home.parts.joint; P.go(-45.6, 72.6, { tol: 0.4 }); P.settle(); P.face(J.x, J.z); game.step(1.2); });
await shot('04-joint-shown');
s = await M();
check('R1.15 the pipe step: the marker on the copper pipe level with him and the star on the pipe', s.step === 'pipe' && s.vis && s.name === 't2_n_pipe' && Math.abs(s.at[0] + 43.5) < 0.1 && s.stars.length === 1 && Math.abs(s.stars[0][0] + 43.5) < 0.1, s);
await shot('05-pipe-step');
await ev(() => { P.tap('F2', 0.1); P.go(-46.4, 70.6, { tol: 0.3, run: true }); P.settle(); P.face(-40, 70.6); game.input.keys.add('ArrowUp'); game.step(0.45); P.tap('Space', 0.02); game.step(1.0); game.input.keys.delete('ArrowUp'); game.step(2.0); });
const r1 = await ev(() => { const r = TM.toWell(); return { pipe: game.flags.pr_pipe, ok: !!game.flags.pr_yardOk, saidLog: game.story.cur.steps.saidLog, r: r.r, d: TM.fromDoor(), cut: window.__cut, obj: document.querySelector('#pause-objective')?.textContent }; });
check('R1.16 the pipe jumped: the yard done (Zoé: be back for dinner, no second send to the well); on to the well by input, no cutscene on the way', r1.pipe === 1 && r1.ok && r1.saidLog.includes('t2_zoe_done') && !/the well/.test(await S('t2_zoe_done')) && r1.d > 70 && r1.cut === 0, r1);
await ev(() => { game.save(false); });
const he = await ev(async () => { const { STR } = await import('./src/game/i18n.js'); return ['t2_n_tap', 't2_where_barrels', 't2_call_kettle', 'prh_yard_b', 'prh_joint_1', 'prh_barrel_try'].map((k) => !!STR.he?.[k]); });
check('R1.17 the new lines have their Hebrew', he.every(Boolean), he);

// ============================================================ R2 a returning player: the barrels first, then straight for the well
await page.reload(); await open(page, '?nocine');
await newGame(); await helpers();
await ev(() => { TM.ballOut(); TM.out(); TM.listen(); TM.throwAtBarrels(); });
const r2a = await ev(() => ({ b: TM.barrel(), said: TM.said(), step: game.story.cur.steps.current(), f: !!game.flags.pr_barrel, kettle: !!game.flags.pr_kettle }));
check('R2.1 the barrels before anything else: it counts (the joint shown, his lines), the step is Zoé\'s; nothing to redo later', r2a.f && r2a.b.aside && r2a.said.some((x) => /joint from yesterday/.test(x)) && r2a.step === 'zoe' && !r2a.kettle, r2a);
const r2 = await ev(() => {
  TM.listen(); let maxD = 0, pinned = '', inv0 = game.story.cur.items().map((i) => i.id).join();
  const r = TM.toWell(() => { maxD = Math.max(maxD, TM.fromDoor()); const b = document.querySelector('.zoebark'); if (b && b.style.display === 'block' && /^Zoé:/.test(b.textContent)) pinned = b.textContent; return false; });
  return { r: r.r, maxD, cut: window.__cut, zoeBox: (window.__said || []).filter((x) => x[0] === 'n_zoe').length, saidLog: game.story.cur.steps.saidLog, pinned, ok: !!game.flags.pr_yardOk, items: game.story.cur.items().map((i) => i.id).join(), inv0, kettle: !!game.flags.pr_kettle, obj: document.querySelector('#pause-objective')?.textContent, stars: game.story.cur.markers().map((m) => [+m.x.toFixed(0), +m.z.toFixed(0)]) };
});
await shot('06-straight-to-well');
check('R2.2 straight for the well: no call back, no walk back, no dialogue box: control stays with him all the way', r2.maxD > 70 && r2.cut === 0 && r2.zoeBox === 0 && r2.ok, r2);
check('R2.3 Zoé calls once, the useful thing (take the kettle, Mira wants proof), shown at the screen\'s edge with her name while she is out of view', r2.saidLog.filter((k) => /^t2_call/.test(k)).length === 1 && r2.saidLog.includes('t2_call_kettle') && /Zoé: .*kettle/.test(r2.pinned), r2);
check('R2.4 nothing granted for the skipped steps (no kettle, no item); the objective and the star are the well\'s', !r2.kettle && r2.items === r2.inv0 && /Check the well/.test(r2.obj || '') && r2.stars.some((m) => m[0] === -42 && m[1] === -4), r2);
const r2b = await ev(() => {
  const W = game.world.well; P.use(W.x, W.z, { near: 1.8, kind: 'well' }); P.settle();
  P.talk('mira'); P.settle(); const no = !!game.flags.pr_miraNo, key0 = !!game.flags.key;
  const zs = game.story.cur.markers().some((m) => m.label === 'Zoé');
  P.talk('zoe'); TM.found(); P.settle();
  P.talk('mira'); TM.found(); P.settle();
  return { seen: !!game.flags.wellSeen, no, key0, zs, kettle: !!game.flags.pr_kettle, key: !!game.flags.key, cut: window.__cut };
});
check('R2.5 the main route still teaches what it needs: Mira refuses without proof, the star goes to Zoé, the kettle, then the key', r2b.seen && r2b.no && !r2b.key0 && r2b.zs && r2b.kettle && r2b.key && r2b.cut === 0, r2b);

// ============================================================ R3 a reload halfway through the yard
await page.reload(); await open(page, '?nocine');
await newGame(); await helpers();
await ev(() => { TM.ballOut(); TM.out(); P.talk('zoe'); TM.found(); game.step(1.6); P.tap('KeyI', 0.3); P.tap('KeyI', 0.3); P.settle(); game.step(1.6); const Y = game.story.cur.home.parts.yard; P.use(Y.x, Y.z, { near: 1.2, kind: 'h_yard' }); P.settle(); game.step(1.6); game.save(false); });
await cont(); await helpers();
s = await M();
const r3a = await ev(() => ({ b: TM.barrel(), room: game.room?.id ?? 'out' }));
check('R3.1 saved mid-yard and loaded: the barrels step again, its marker and star on the near barrel, the barrel in its place', s.step === 'barrels' && s.vis && s.name === 't2_n_barrels' && agree(s) && !r3a.b.aside && r3a.room === 'out', { s, r3a });
await ev(() => { TM.throwAtBarrels(); game.save(false); });
await cont(); await helpers();
s = await M();
const r3b = await ev(() => TM.barrel());
check('R3.2 knocked, saved, loaded: the barrel stays aside (its collider too), the pipe step', s.step === 'pipe' && r3b.aside && Math.abs(r3b.at[1] - (r3b.z0 - 1.0)) < 0.05 && Math.abs(r3b.col[1] - r3b.at[1]) < 0.01, { s, r3b });
const r3c = await ev(() => { TM.listen(); P.go(-41.5, 71.5, { tol: 0.8 }); const r = P.go(-41.5, 52, { tol: 1.0 }); P.settle(); game.step(0.5); return { r: r.r, d: TM.fromDoor(), pipe: game.flags.pr_pipe || 0, ok: !!game.flags.pr_yardOk, cut: window.__cut, saidLog: game.story.cur.steps.saidLog || [], step: game.story.cur.steps.current() }; });
check('R3.3 the pipe walked round (no jump): he goes on, the yard let go with one call (show Mira the crystals), no cutscene, no pipe flag granted', r3c.d > 20 && r3c.ok && r3c.cut === 0 && r3c.saidLog.includes('t2_call_go') && r3c.pipe === 0 && !r3c.step, r3c);
// a save as the build before TUT-MYSTERY wrote it: the steps' flags mid-yard, the barrels already hit (no barrel state saved)
await ev(() => {
  const s0 = game.snapshot();
  for (const k of ['pr_pipe', 'pr_yardOk', 'wellSeen']) delete s0.flags[k];
  Object.assign(s0.flags, { pr_v2: 1, pr_tut2: 1, pr_kettle: true, pr_yard: true, pr_barrel: true });
  s0.tut = { v: 1, done: ['move', 'inventory', 'talk', 'use', 'advance', 'ball'], gone: [] };
  s0.room = null; s0.hero.x = -44.8; s0.hero.z = 74.5; s0.hero.hasBall = true;
  localStorage.setItem('lba3_save_v1', JSON.stringify(s0));
});
await cont(); await helpers();
s = await M();
const r3d = await ev(() => { const b = TM.barrel(); P.tap('F2', 0.1); P.go(-46.4, 70.6, { tol: 0.3, run: true }); P.settle(); P.face(-40, 70.6); game.input.keys.add('ArrowUp'); game.step(0.45); P.tap('Space', 0.02); game.step(1.0); game.input.keys.delete('ArrowUp'); game.step(2.0); return { b, pipe: game.flags.pr_pipe, ok: !!game.flags.pr_yardOk, state: game.state }; });
check('R3.4 an older save mid-yard (barrels hit before this build): loads at the pipe step, the barrel aside, the jump finishes the yard', s.step === 'pipe' && r3d.b.aside && r3d.pipe === 1 && r3d.ok && r3d.state === 'play', { s, r3d });
await browser.close();
done();
