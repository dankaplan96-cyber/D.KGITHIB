// TUTOR-TARGETS (P67, the user, 18.11.2026: "the tap", "the barrels": the player couldn't identify the object). Each of
// the opening's steps with a thing to find points at it: a gold marker over the exact object, an arrow at the screen's
// edge when it is off the screen, a "where" line after a while, Zoé's own reminder after a longer while; with Show
// control tips Off too; after a save and load. src/game/tutorial.js (mark, arrow), story/openingsteps.js (target).
// Short by design (the user, 18.11: "keep tests minimal"); the full steps by input stay in opening-tutorial.mjs.
// Captures: captures/tutor-targets/*.jpg.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const CAP = fileURLToPath(new URL('../captures/tutor-targets/', import.meta.url));
mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { await ev(() => { game.renderer.render(); }); await page.screenshot({ path: CAP + n + '.jpg', type: 'jpeg', quality: 82, timeout: 180000 }); };
// what the marker shows now: the step, the target's name and where it stands, the marker's place, the arrow
const M = () => ev(() => {
  const tu = game.tutorial, T = tu.markAt, mk = tu._mk, c = mk?.cone.position;
  const ar = document.getElementById('tiparrow');
  return { step: game.story.cur?.steps?.current?.() ?? null, name: T?.name ?? null, at: T ? [+T.x.toFixed(1), +T.z.toFixed(1)] : null,
    vis: !!mk?.group.visible, cone: c ? [+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1)] : null,
    arrow: ar && ar.style.display === 'block' ? ar.textContent : null, tip: document.querySelector('#tip.show')?.textContent || '' };
});
const near = (a, b, d) => !!a && !!b && Math.hypot(a[0] - b[0], a[1] - b[1]) < d;

await open(page, '?nocine');
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });

// the house: the cupboard
let s = await M();
const cup = await ev(() => { const c = game.room.cupboard; return [+c.x.toFixed(1), +c.z.toFixed(1)]; });
check('T1 the house: the marker over the cupboard itself (the wardrobe), named Cupboard', s.step === 'ball' && s.vis && s.name === 't2_n_ball' && near(s.at, cup, 0.1), s);
await shot('01-house-cupboard');
// the ball, then the door
await ev(() => { const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.go(sp.x, sp.z, { tol: 1.2 }); P.use(sp.x, sp.z); for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(1.2); });
s = await M();
const door = await ev(() => { const e = game.room.exits.find((x) => x.to === 'outdoor'); return [+e.x.toFixed(1), +e.z.toFixed(1)]; });
check('T2 the ball found: the marker moves to the front door', s.step === 'out' && s.vis && s.name === 't2_n_out' && near(s.at, door, 0.1), s);
// the yard: Zoé, then the tap, the barrels, the pipe (each step done by the harness's own input, then the marker read)
await ev(() => { const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); P.settle(); game.step(1.0); });
s = await M();
const zp = await ev(() => { const z = P.npc('zoe'); return [+z.pos.x.toFixed(1), +z.pos.z.toFixed(1)]; });
check('T3 out in the yard: the marker over Zoé', s.step === 'zoe' && s.vis && s.name === 't2_n_zoe' && near(s.at, zp, 0.1), s);
await ev(() => { P.talk('zoe'); for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(1.6); });
s = await M();
check('T4 the inventory step: no marker (a key, not a place)', s.step === 'inv' && !s.vis && !s.arrow, s);
await ev(() => { P.tap('KeyI', 0.3); P.tap('KeyI', 0.3); P.settle(); game.step(1.6); });
s = await M();
const tapAt = await ev(() => { const Y = game.story.cur.home.parts.yard; return [+Y.position.x.toFixed(1), +Y.position.z.toFixed(1)]; });
check('T5 the tap step: the goal says where ("by the front door"); the marker over the garden standpipe itself', s.step === 'tap' && /garden tap by the front door/.test(s.tip) && s.vis && s.name === 't2_n_tap' && near(s.at, tapAt, 0.1), s);
await shot('02-yard-tap');
// left undone: the where line, then Zoé's reminder (in play, the hint's clock)
await ev(() => game.step(16));
s = await M();
check('T6 a step left 15 s: the panel adds where the tap is (brass, stone foot, bucket)', /brass tap on a stone foot/.test(s.tip), s.tip);
const said = await ev(() => { game.step(21); return game.story.cur.steps.saidLog || []; });
check('T7 after 35 s: Zoé says which tap she means', said.includes('t2_hint_tap'), said);
// the tap done; the barrels
await ev(() => { const Y = game.story.cur.home.parts.yard; P.use(Y.position.x, Y.position.z, { near: 1.2, kind: 'h_yard' }); P.settle(); game.step(1.6); });
s = await M();
const bar = await ev(() => { const B = game.story.cur.barrels(); return [+B.x.toFixed(1), +B.z.toFixed(1)]; });
check('T8 the barrels step: the goal names the two barrels by the house; the marker over them', s.step === 'barrels' && /two barrels by the house/.test(s.tip) && s.vis && s.name === 't2_n_barrels' && near(s.at, bar, 0.1), s);
await shot('03-yard-barrels');
// the arrow: the camera turned away from the barrels (the hero turned and walked a way up the lane)
const arr = await ev(() => { P.go(-43.0, 62.0, { tol: 0.6 }); P.settle(); game.step(0.5); const v = game.tutorial.markAt; const p = new game.camera.position.constructor(v.x, v.y, v.z).project(game.camera); return { onScreen: p.z < 1 && Math.abs(p.x) < 0.94 && Math.abs(p.y) < 0.9, arrow: document.getElementById('tiparrow')?.style.display, label: document.getElementById('tiparrow')?.textContent }; });
check('T9 the barrels off the screen → the edge arrow with their name; on the screen → no arrow', arr.onScreen ? arr.arrow !== 'block' : (arr.arrow === 'block' && /Barrels/.test(arr.label)), arr);
// Show control tips Off: the goal and the marker stay
await ev(() => { game.settings.tips = 'off'; game.step(0.5); });
s = await M();
check('T10 Show control tips Off: the goal line and the marker stay (only the keys go)', s.vis && /two barrels/.test(s.tip) && !(await ev(() => !!document.querySelector('#tip.show kbd'))), s);
await ev(() => { game.settings.tips = 'on'; });
// save and load mid-step: the same marker
await ev(() => game.save(false));
await page.reload(); await open(page, '?nocine'); await menu(page, 'continue');
await page.waitForFunction(() => game.state === 'play', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); });
s = await M();
check('T11 saved and loaded mid-step: the barrels still marked', s.step === 'barrels' && s.vis && s.name === 't2_n_barrels', s);
// the barrels hit (the harness's way), then the pipe: the marker on the pipe level with him
await ev(() => { const B = game.story.cur.barrels(); P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); P.face(B.x, B.z); P.tap('KeyF', 0.05); game.step(2.0); P.settle(); game.step(1.6); });
s = await M();
check('T12 the pipe step: the marker on the copper pipe (x −43.5), level with him', s.step === 'pipe' && s.vis && s.name === 't2_n_pipe' && Math.abs(s.at[0] + 43.5) < 0.1 && s.at[1] >= 66 && s.at[1] <= 72.1, s);
await shot('04-yard-pipe');
// Hebrew: the names and the where lines exist
const he = await ev(async () => { const { STR } = await import('./src/game/i18n.js'); return ['t2_n_tap', 't2_where_barrels', 't2_hint_pipe'].map((k) => !!STR.he?.[k]); });
check('T13 the new lines have their Hebrew', he.every(Boolean), he);
// the yard done: no marker
await ev(() => { P.openingYard(); game.step(1.0); });
s = await M();
check('T14 the yard done: the marker and the arrow gone', !s.step && !s.vis && !s.arrow, s);
await browser.close();
done();
