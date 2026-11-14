// OPENING-TUT (the user, 14.11.2026): the opening at home as a playable tutorial (src/game/tutorial.js, story/hometap.js,
// story/prologue.js). Driven by input (tests/lib/player.js: held and tapped keys, a faked gamepad), never by setting a
// lesson; story flags are only read, except in the two "reproduced" checks, which say so.
//   A  a new player following every tip, keyboard (Classic, the default): move · talk (prompt only when facing) · the
//      dialogue box's key hint (show all, then next) · the kitchen tap · the door waits for the ball only · the cupboard ·
//      Open Inventory · save half way and load: the lessons kept · out of the door: Zoé in view, her kettle · the
//      standpipe · Athletic and the jump over the project's pipe (a missed jump first: stopped, no harm) · into the house
//      and out again with a tip up · the ball at the barrels (misses first: back in his hand each time, quick) · the arc ·
//      out of magic: the barrels give it back
//   B  tips off from the start (Settings): no tip, no key hint, the story goes on; tips on again: nothing learned is
//      asked again · an experienced player acting before a tip: no tip · a remapped key in the tip · a faked gamepad:
//      the tip in its buttons, Free camera's tip, switching back to the keyboard mid-tip · the optional practice left
//      unfinished, on to the well: no yard tip in town, the well's step plays
//   C  old saves: one from the cup's days (pr_v2, pr_tap, no pr_cup, no tutorial state) and one with the cup moved: both
//      load and play on, no tip for a player under way, the door opens with the ball
// Prints PASS/FAIL per check (R7-VERDICTS). Captures: captures/opening-tut/ (looked at by hand, not judged here).
import { launch, open, menu, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const CAP = fileURLToPath(new URL('../captures/opening-tut/', import.meta.url));
mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { await ev(() => { game.renderer.render(); }); await page.screenshot({ path: CAP + n + '.png' }); };
const T = () => ev(() => ({ tip: game.tutorial.shown, text: document.querySelector('#tip.show')?.textContent ?? null, done: [...game.tutorial.done].sort(), gone: [...game.tutorial.gone].sort(), state: game.state, room: game.room?.id ?? 'out' }));
const newGame = async () => {
  await page.click('[data-act="new"]');
  if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
  await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
  await ev(() => { game.testFreeze = true; game.step(1.2); });
};
// shared page helpers: the house's door, the yard's spots
const helpers = () => ev(async () => {
  const inp = await import('./src/engine/input.js');   // (the same module the game uses: its live bindings)
  window.TT = {
    code(a) { return inp.keyFor(a); },
    door() { return game.room.exits.find((x) => x.to === 'outdoor'); },
    out() { P.settle(); const e = TT.door(); const r = P.through(e.x, e.z); game.step(0.6); return r; },
    inside() { P.settle(); const d = game.world.houses[0].door; P.through(d.x, d.z); game.step(0.6); },
    labels(a) { return game.hud.key(a); },
    tipHas(...words) { const s = document.querySelector('#tip.show')?.textContent || ''; return words.every((w) => s.includes(w)); },
    // the tip box keeps clear of the dialogue, the prompt and the middle of the screen (where Twinsen is)
    tipBox() { const e = document.querySelector('#tip.show'); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left | 0, t: r.top | 0, r: r.right | 0, b: r.bottom | 0, mid: r.right < innerWidth * 0.4 }; },
  };
});

// ============================================================ A: a new player following the tips (keyboard)
await open(page, '?nocine');
await newGame();
await helpers();
let s = await T();
check('A1 control at once in the house, a single tip: Move, in the keys in use (Classic: walk and turn)', s.tip === 'move' && (await ev(() => TT.tipHas(TT.labels('up'), TT.labels('left'), TT.labels('right')))) && !s.done.includes('move'), s);
check('A1 the tip clear of the screen middle (Twinsen), the dialogue and the prompt', await ev(() => { const b = TT.tipBox(); return !!b && b.mid; }), await ev(() => TT.tipBox()));
await shot('a1-control');
await ev(() => { P.holdFor(['ArrowUp'], 1.1); game.step(0.4); });
s = await T();
check('A2 a short walk completes Move (the real movement), the tip goes, no banner', s.done.includes('move') && s.tip !== 'move' && !(await ev(() => (game.hud.toastLog || []).some((m) => /great|well done|good job/i.test(m)))), s);
// the kitchen pipe knocks by itself (what draws him to the sink); Arthur at his boat: "Talk" only facing him in reach
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
check('A3 "Talk" shows facing Arthur in reach, not with his back to him', /Talk/.test(talk.facing) && !/Talk/.test(talk.away) && talk.facing.includes(talk.key), talk);
check('A3 the dialogue box teaches its key: "Show all" while a line types (and it does), then "Next"', talk.typing && /Show all/.test(talk.k1) && talk.whole && /Next/.test(talk.k2) && talk.k1.includes(talk.key), talk);
await shot('a3-dialogue-hint');
await ev(() => P.settle());
const tap = await ev(() => {
  const H = game.story.chapters[0].home.parts.house; const spk = [];
  const r = P.use(H.spout.x, H.spout.z, { near: 1.2, kind: 'h_tap' });
  return { r: r.r, lines: r.lines, tap: !!game.flags.pr_tap };
});
check('A4 the kitchen tap by hand: dry, the knocking, Arthur heard it all morning', tap.tap && tap.lines >= 2, tap);
const door = await ev(() => { const e = TT.door(); const r = P.through(e.x, e.z); const said = game.state; P.settle(); return { said, room: game.room?.id, ball: game.hero.hasBall }; });
check('A5 the door before the ball: a line ("take the magic ball"), still in the house: the story, not a lesson', door.room === 'house' && !door.ball, door);
const ball = await ev(() => { const sp = game.room.searches[0]; P.use(sp.x, sp.z); for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(1.2); return { ball: game.hero.hasBall, tip: game.tutorial.shown, has: TT.tipHas(TT.labels('inventory'), 'Inventory') }; });
check('A6 the cupboard gives the ball; then one tip: Open Inventory, in its real key', ball.ball && ball.tip === 'inventory' && ball.has, ball);
await shot('a6-inventory-tip');
const inv = await ev(() => { P.tap(TT.code('inventory'), 0.3); return { state: game.state, foot: document.querySelector('#inventory .inv-hint')?.textContent, sel: document.querySelector('#inventory .inv-name')?.textContent }; });
check('A6 the inventory opens on its key: the footer says how to select and close', inv.state === 'inventory' && /select/.test(inv.foot) && /close/.test(inv.foot), inv);
await shot('a6-inventory');
await ev(() => { P.tap(TT.code('inventory'), 0.3); game.step(0.4); });
s = await T();
check('A6 closed on the same key: Inventory learned, its tip gone', s.state === 'play' && s.done.includes('inventory') && s.tip !== 'inventory', s);
// save half way, reload, Continue: the lessons are kept, nothing learned comes back
await ev(() => game.save(false));
await page.reload(); await open(page, '?nocine'); await menu(page, 'continue');
await page.waitForFunction(() => game.state === 'play', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.5); });
await helpers();
s = await T();
check('A7 saved half way and loaded: in the house with the ball; Move and Inventory still learned, no tip for them', s.room === 'house' && s.done.includes('move') && s.done.includes('inventory') && !['move', 'inventory'].includes(s.tip) && (await ev(() => game.hero.hasBall)), s);
const out = await ev(() => { const r = TT.out(); const z = P.npc('zoe'), h = game.hero; return { to: r.to, zoe: +Math.hypot(z.pos.x - h.pos.x, z.pos.z - h.pos.z).toFixed(1), zoeIn: game.camRig ? (() => { const v = z.pos.clone(); v.y += 1; v.project(game.camera); return Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1; })() : null, tip: game.tutorial.shown, cam: game.settings.camera }; });
check('A8 out of the door: Zoé a few steps off, in view (back from next door); Follow camera: no camera tip', out.to === 'citadel' && out.zoe < 7 && out.zoeIn && out.tip !== 'camera' && out.cam === 'follow', out);
await shot('a8-yard-zoe');
const zoe = await ev(() => { const r = P.talk('zoe'); for (let i = 0; i < 20 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } return { r: r.r, kettle: !!game.flags.pr_kettle }; });
check('A9 Zoé, back from next door: their kettle furred with warm crystals', zoe.kettle, zoe);
const yard = await ev(() => { const Y = game.story.chapters[0].home.parts.yard; const r = P.use(Y.x, Y.z, { near: 1.2, kind: 'h_yard' }); return { r: r.r, lines: r.lines, yard: !!game.flags.pr_yard }; });
check('A10 the garden standpipe by hand: dry, knocking, the sound runs under the lane', yard.yard && yard.lines >= 1, yard);
// the project's pipe: Athletic, then Jump; a missed jump first
await ev(() => { P.go(-45.0, 69.6, { tol: 0.4 }); game.step(1.2); });
s = await T();
check('A11 by the project\'s pipe: one tip, Switch to Athletic, in its key', s.tip === 'athletic' && (await ev(() => TT.tipHas(TT.labels('b2'), 'Athletic'))), s);
await shot('a11-athletic-tip');
await ev(() => { P.tap('F2', 0.2); game.step(0.9); });
s = await T();
check('A12 switched: the tip moves on to the action button\'s new use: Jump', s.done.includes('athletic') && s.tip === 'jump' && (await ev(() => TT.tipHas(TT.labels('action'), 'Jump'))) && (await ev(() => game.hero.behaviour)) === 'athletic', s);
await shot('a12-jump-tip');
const miss = await ev(() => { const h = game.hero; P.face(-40, 69.6); const hp = h.hp; game.input.keys.add('ArrowUp'); game.step(1.6); game.input.keys.delete('ArrowUp'); game.step(0.4); return { x: +h.pos.x.toFixed(2), hp: h.hp, hp0: hp, jumped: game.tutorial.done.has('jump') }; });
check('A13 running into the pipe without a jump: stopped on his side, no harm, nothing to redo', miss.x < -43.7 && miss.hp === miss.hp0 && !miss.jumped, miss);
const jump = await ev(() => { const h = game.hero; P.go(-46.4, 70.6, { tol: 0.3, run: true }); P.settle(); P.face(-40, 70.6); game.input.keys.add('ArrowUp'); game.step(0.45); P.tap('Space', 0.02); game.step(1.0); game.input.keys.delete('ArrowUp'); game.step(0.5); return { x: +h.pos.x.toFixed(2), done: game.tutorial.done.has('jump'), tip: game.tutorial.shown }; });
check('A14 the running jump clears the pipe (landing on the grass beyond); Jump learned', jump.x > -43.2 && jump.done && jump.tip !== 'jump', jump);
// the barrels: a tip, into the house and out with it up, misses, a hit, the arc
await ev(() => { P.tap('F1', 0.1); P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); P.go(-45.3, 73.0, { tol: 0.4 }); game.step(1.2); });
s = await T();
check('A15 the barrels in view: one tip, aim and throw in the real keys', s.tip === 'ball' && (await ev(() => TT.tipHas(TT.labels('ball'), 'barrels'))), s);
await shot('a15-ball-tip');
const inout = await ev(() => { TT.inside(); const inTip = game.tutorial.shown; TT.out(); P.go(-45.3, 73.0, { tol: 0.4 }); game.step(1.4); return { inTip, outTip: game.tutorial.shown, room: game.room?.id ?? 'out', gone: game.tutorial.gone.has('ball') }; });
check('A16 into the house and out with the tip up: hidden inside, back outside, not dropped', inout.inTip !== 'ball' && inout.outTip === 'ball' && !inout.gone, inout);
const misses = await ev(() => {
  const h = game.hero, B = game.story.cur.barrels(), times = [];
  for (let i = 0; i < 3; i++) { P.face(B.x + 6, B.z - 20); const t0 = game.time; P.tap('KeyF', 0.05); let k = 0; while (game.ball.state === 'idle' && k++ < 30) game.step(1 / 30); while (game.ball.state !== 'idle' && game.time - t0 < 8) game.step(1 / 30); times.push(+(game.time - t0).toFixed(2)); }
  game.step(0.8);
  return { times, hit: !!game.flags.pr_barrel, mp: h.mp, tip: game.tutorial.shown };
});
check('A17 three throws away from the barrels: back in his hand each time within 3.5 s, nothing hit, the tip stays', misses.times.every((x) => x < 3.5) && !misses.hit && misses.tip === 'ball', misses);
const hit = await ev(() => { const B = game.story.cur.barrels(); P.face(B.x, B.z); P.tap('KeyF', 0.05); game.step(2.0); P.settle(); game.step(0.6); return { hit: !!game.flags.pr_barrel, hits: B.hits, ball: game.ball.state, tip: game.tutorial.shown, done: game.tutorial.done.has('ball') }; });
check('A18 facing the barrels, one throw: a hit (flash, knock, his word); the ball comes back; Throw learned', hit.hit && hit.done && hit.ball === 'idle', hit);
check('A18 then the optional arc tip', hit.tip === 'arc' || (await ev(() => game.tutorial.shown)) === 'arc', hit);
await shot('a18-arc-tip');
const arc = await ev(() => { const B = game.story.cur.barrels(); P.face(B.x, B.z); game.input.keys.add('KeyF'); game.step(0.8); const dots = game.ball.dots.some((d) => d.visible) || game.ball.landMark.visible; game.input.keys.delete('KeyF'); game.step(2.4); P.settle(); return { dots, done: game.tutorial.done.has('arc'), mp: game.hero.mp }; });
check('A19 holding the ball key shows the arc (the game\'s own preview dots and ring); learned on the hold', arc.dots && arc.done, arc);
// out of magic (every throw costs one, as in LBA2): a short word that the ball still works, and it does: a throw at the
// barrels with no magic left still hits and comes back
const magic = await ev(() => {
  const B = game.story.cur.barrels(), h = game.hero;
  for (let i = 0; i < 12 && h.mp >= 1; i++) { P.face(B.x + 5, B.z - 20); P.tap('KeyF', 0.05); let k = 0; while (game.ball.state !== 'idle' && k++ < 200) game.step(1 / 30); }
  game.step(1.0);
  const tip = game.tutorial.shown, text = document.querySelector('#tip.show')?.textContent;
  const n0 = B.hits || 0; P.face(B.x, B.z); P.tap('KeyF', 0.05); let k = 0; while (game.ball.state === 'idle' && k++ < 30) game.step(1 / 30); while (game.ball.state !== 'idle' && k++ < 300) game.step(1 / 30);
  return { tip, text, mp: h.mp, hit: (B.hits || 0) > n0, ball: game.ball.state };
});
check('A20 out of magic: one short word (the ball still flies, no bounces), and a throw at the barrels still hits and returns', magic.tip === 'magic' && magic.mp === 0 && magic.hit && magic.ball === 'idle', magic);
await shot('a20-after');

// ============================================================ B: tips off, the experienced player, remap, gamepad
await page.reload(); await open(page, '?nocine');
// Settings, Game: Show control tips: Off (the menu's own button)
await page.click('[data-act="settings"]'); await page.click('.seg[data-setting="tips"] button[data-v="off"]'); await page.click('#settings [data-act="back"]');
check('B0 Settings has "Show control tips"; Off is kept', await ev(() => game.settings.tips === 'off' && !!document.querySelector('.seg[data-setting="tips"]')), await ev(() => game.settings.tips));
await newGame(); await helpers();
const off = await ev(() => {
  const seen = new Set(); const watch = () => { const t = document.querySelector('#tip.show'); if (t) seen.add(t.textContent); if (document.querySelector('#dialog .tutkey')) seen.add('dialog key'); };
  watch(); P.holdFor(['ArrowUp'], 0.6); watch();
  const a = P.npc('arthur'); P.talk('arthur'); watch();
  const sp = game.room.searches[0]; P.use(sp.x, sp.z); for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(1); watch();
  TT.out(); watch(); P.talk('zoe'); for (let i = 0; i < 20 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } watch();
  P.go(-45.0, 69.6, { tol: 0.4 }); game.step(1.5); watch(); P.go(-45.3, 73.0, { tol: 0.4 }); game.step(1.5); watch();
  return { seen: [...seen], ball: game.hero.hasBall, kettle: !!game.flags.pr_kettle, room: game.room?.id ?? 'out', done: [...game.tutorial.done].sort() };
});
check('B1 tips off from the start: no tip and no dialogue key hint anywhere; the story goes on (ball, door, kettle)', off.seen.length === 0 && off.ball && off.kettle && off.room === 'out', off);
check('B1 the actions are still recognised with tips off (moved, talked)', off.done.includes('move') && off.done.includes('talk'), off.done);
// tips on again (pause, Settings): nothing already done is asked for
await ev(() => { game.settings.tips = 'on'; game.applySettings?.(); game.step(1.0); });
s = await T();
check('B2 tips on again: what was done with tips off is not asked for (Move, Talk); what was not is (Open Inventory)', !['move', 'talk'].includes(s.tip) && s.tip === 'inventory', s);
await ev(() => { P.tap(TT.code('inventory'), 0.3); P.tap(TT.code('inventory'), 0.3); game.step(1.0); });
// experienced: Athletic and a jump before the pipe's tip could show
const exp = await ev(() => { P.tap('F2', 0.1); game.step(0.2); P.tap('Space', 0.05); game.step(1.0); P.tap('F1', 0.1); const seenAt = []; P.go(-45.0, 69.6, { tol: 0.4 }); for (let i = 0; i < 6; i++) { game.step(0.3); seenAt.push(game.tutorial.shown); } return { seenAt, done: [...game.tutorial.done] }; });
check('B3 an experienced player switches and jumps before the tip: Athletic and Jump learned, no tip by the pipe', exp.done.includes('athletic') && exp.done.includes('jump') && !exp.seenAt.some((x) => x === 'athletic' || x === 'jump'), exp);
// remap the ball's key on the controls screen, by input: the tip shows the new key
await ev(() => { P.go(-45.3, 73.0, { tol: 0.4 }); game.step(1.2); });
await ev(() => game.pause());
await page.click('#pause [data-act="controls"]');
await page.click('#rebind .keybtn[data-action="ball"]'); await page.keyboard.press('KeyG');
await page.click('#controls [data-act="back"]'); await page.click('#pause [data-act="resume"]');
await ev(() => { game.testFreeze = true; game.step(1.0); });
const remap = await ev(() => ({ key: TT.labels('ball'), text: document.querySelector('#tip.show')?.textContent, tip: game.tutorial.shown }));
check('B4 a remapped key: the tip names the new key at once', remap.tip === 'ball' && remap.key === 'G' && /\bG\b/.test(remap.text), remap);
await shot('b4-remapped');
// a faked gamepad (the standard mapping): the tip in its buttons; auto controls turn on the Free camera
await ev(() => {
  const btn = () => ({ pressed: false, value: 0 });
  window.__pad = { connected: true, id: 'test pad', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
  navigator.getGamepads = () => [window.__pad];
  window.__pad.axes[0] = 0.5; game.step(0.1); window.__pad.axes[0] = 0; game.step(1.0);
});
const pad = await ev(() => ({ dev: game.input.lastDevice, tip: game.tutorial.shown, text: document.querySelector('#tip.show')?.textContent, cam: game.settings.camera }));
check('B5 a gamepad mid-tip: auto controls give it the Free camera, and its tip comes up in the pad\'s terms (Right stick)', pad.dev === 'pad' && pad.cam === 'free' && pad.tip === 'camera' && /Right stick/.test(pad.text || ''), pad);
await shot('b5-pad-camera-tip');
const cam = await ev(() => { window.__pad.axes[2] = 0.8; game.step(0.5); window.__pad.axes[2] = 0; game.step(1.2); return { done: game.tutorial.done.has('camera'), tip: game.tutorial.shown, text: document.querySelector('#tip.show')?.textContent }; });
check('B6 the right stick turns the camera: learned; the next tip (the ball) in the pad\'s buttons (left stick, Y)', cam.done && cam.tip === 'ball' && /\bY\b/.test(cam.text || '') && /left stick/.test(cam.text || ''), cam);
await shot('b6-pad-ball-tip');
const padThrow = await ev(() => { const B = game.story.cur.barrels(); const n0 = B.hits || 0; window.__pad.buttons[3].pressed = true; game.step(1 / 30); window.__pad.buttons[3].pressed = false; let thrown = false; for (let i = 0; i < 30; i++) { game.step(1 / 30); thrown ||= game.ball.state === 'fly'; } game.step(2.4); return { thrown, hits: (B.hits || 0) - n0, done: game.tutorial.done.has('ball'), ball: game.ball.state }; });
check('B7 the pad\'s Y throws (the game\'s own binding) and the ball comes back', padThrow.thrown && padThrow.ball === 'idle', padThrow);
// back to the keyboard mid-tip: the labels follow
const back = await ev(() => { game.input.keys.add('ArrowLeft'); game.input.lastDevice = 'kbd'; game.step(0.3); game.input.keys.delete('ArrowLeft'); navigator.getGamepads = () => []; game.step(0.6); return { dev: game.input.lastDevice, text: document.querySelector('#tip.show')?.textContent ?? null, tip: game.tutorial.shown }; });
check('B8 back to the keyboard: no pad button left in the tip', back.dev === 'kbd' && !/\b(Y|View|Left stick|Right stick)\b/.test(back.text || ''), back);
// optional practice left unfinished, on to the well: no yard tip in town, the well's step plays
const well = await ev(() => { const W = game.world.well; let r; for (let k = 0; k < 4; k++) { r = P.go(W.x + 2.6, W.z + 0.4, { tol: 0.8, run: true, maxT: 200 }); P.settle(); if (r.r === 'arrived') break; } game.step(1.0); const tips = new Set(); for (let i = 0; i < 6; i++) { game.step(0.3); if (game.tutorial.shown) tips.add(game.tutorial.shown); } const u = P.use(W.x, W.z, { near: 1.8, kind: 'well' }); return { r: r.r, tips: [...tips], seen: !!game.flags.wellSeen, arc: game.tutorial.done.has('arc'), d: +Math.hypot(game.hero.pos.x - W.x, game.hero.pos.z - W.z).toFixed(1) }; });
check('B9 on to the well with practice unfinished: no yard tip in town, the well inspected (the story goes on)', well.seen && !well.tips.some((x) => ['ball', 'arc', 'athletic', 'jump', 'camera', 'magic', 'inventory'].includes(x)), well);
await shot('b9-well');
// reproduced (flags set for the check, a second pass: these places are minutes of play away): the lid's tip
const kick = await ev(() => { const f = game.flags, W = game.world.well; f.key = true; f.pr_lidStuck = true; game.hero.hasKey = true; game.story.cur.setLid('stuck'); P.go(W.x + 2.4, W.z + 0.4, { tol: 0.5 }); game.step(1.2); const t1 = document.querySelector('#tip.show')?.textContent; P.tap('F3', 0.2); game.step(1.0); const t2 = document.querySelector('#tip.show')?.textContent; return { t1, t2 }; });
check('B10 (reproduced: flags set) at the stuck lid: Switch to Aggressive, then the kick\'s key', /Aggressive/.test(kick.t1 || '') && /Kick the lid/.test(kick.t2 || ''), kick);

// ============================================================ C: old saves
// a save from the cup's days, in the house after the tap, the cup not moved, no tutorial state
const legacy = await ev(() => {
  const s0 = game.snapshot(); delete s0.tut;
  s0.room = 'house'; s0.hero.x = game.rooms.house.npcSpots.twinsen.x; s0.hero.z = game.rooms.house.npcSpots.twinsen.z; s0.hero.hasBall = false;
  s0.searched = (s0.searched || []).filter((k) => k !== 'cupboard');
  Object.assign(s0.flags, { pr_v2: 1, pr_tap: true, pr_cup: false, pr_zoeOut: false, key: false, pr_lidStuck: false, wellSeen: false, pr_kettle: false, pr_yard: false, pr_barrel: false });
  localStorage.setItem('lba3_save_v1', JSON.stringify(s0)); return true;
});
await page.reload(); await open(page, '?nocine'); await menu(page, 'continue');
await page.waitForFunction(() => game.state === 'play', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); });
await helpers();
const c1 = await ev(() => {
  const tip = game.tutorial.shown; const sp = game.room.searches[0]; P.use(sp.x, sp.z); for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(1);
  const r = TT.out(); const z = P.npc('zoe');
  return { tip, ball: game.hero.hasBall, to: r.to, zoe: +Math.hypot(z.pos.x - game.hero.pos.x, z.pos.z - game.hero.pos.z).toFixed(1), tipOut: game.tutorial.shown, done: game.tutorial.done.size };
});
check('C1 a save from the cup\'s days (tap tried, cup not moved, no tutorial state): loads; no tip; ball, door, Zoé in the yard', !c1.tip && c1.ball && c1.to === 'citadel' && c1.zoe < 8 && !c1.tipOut, c1);
await ev(() => {
  const s0 = game.snapshot(); delete s0.tut; Object.assign(s0.flags, { pr_v2: 1, pr_tap: true, pr_cup: true, pr_zoeOut: true });
  s0.room = null; s0.hero.x = -44.8; s0.hero.z = 71.5; s0.hero.hasBall = true;
  localStorage.setItem('lba3_save_v1', JSON.stringify(s0));
});
await page.reload(); await open(page, '?nocine'); await menu(page, 'continue');
await page.waitForFunction(() => game.state === 'play', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); });
const c2 = await ev(() => ({ state: game.state, room: game.room?.id ?? 'out', zoe: !!P.npc('zoe')?.present, obj: document.querySelector('#pause-objective').textContent, tip: game.tutorial.shown }));
check('C2 a save with the cup moved (pr_cup, pr_zoeOut): loads outdoors and plays on; the objective is the well\'s', c2.state === 'play' && c2.room === 'out' && /well|Mira|lid|rope/i.test(c2.obj) && !c2.tip, c2);

await browser.close();
done();
