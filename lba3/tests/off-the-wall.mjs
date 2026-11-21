// U-3 "Off the Wall" (the user's side quest; src/game/story/offwall.js, src/game/offwall.js; docs/lba-maturity/U3-OFF-THE-WALL.md).
// Played by input where it says INPUT (the harness's arrow keys, E, F and the pause menu: tests/lib/player.js). Every
// throw is a real one: the magic ball flies, rebounds and rings the bell by the game's own physics; the bot turns on the
// spot with the arrow keys to an angle it measured first with offwall.js flight() (the ball's own flight, followed on the
// island's colliders: the bot knows the answer, as every suite's does) and throws with F.
//   - chapter 4 on Desert Island: the walk from the School's door (S28's canyon) round to the terrace behind it (P83: the
//     court moved with the School); Tali at her
//     bell, the board lying in the sand; a straight throw before she has told the rule (her "Not straight!");
//   - her rule, her demonstration (her red ball off her chalk X into the bell); game 1: a straight hit refused, a plain
//     miss, the ring off the wall; she carries the bell out;
//   - Save & quit → Continue in the middle (game 2);
//   - game 2 (clean): a ring off the wall that touched the sand first is refused; from closer to the wall, a clean one;
//     she carries the bell and stands her board up;
//   - game 3, her way first (from her ring, off the white wall past the board's end): "That's my way!"; Twinsen asks
//     about the board; the ring off the board: "Off my board!", she carries the board into the court, the singing
//     crystal (DES-2's slot, sc-trial) is handed over and picked up;
//   - game 3 the other way (a fresh state by flags at game 3): the board first: the same surprise at once;
//   - the court: the board and the bell moved by him (E, his hands on them) to their next spots; a ring off the wall
//     counted under his name; a straight one not; her magic top-up;
//   - three chapters later and more (chapters 7, 10, the epilogue by their flags): the court as he left it, her line for
//     the part of the story; her own throws off the board;
//   - old saves from before this change (fixtures base-07-dig: chapter 4 on the island; new-13-desert: chapter 10 on the
//     island; base-12: chapter 9 on Zeelich) load with no dx_ow_ state made up, Tali at her bell, the game not started.
// ISO (logged): chapters are set by their flags (as tests/desert-life.mjs and tests/last-ferry.mjs). SHOTS=dir writes jpg
// pictures from the play camera (deviceScaleFactor 1). SwiftShader, headless: Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = (n) => fileURLToPath(new URL(`./fixtures/campaign/${n}.save.json`, import.meta.url));
let { browser, page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const frame = async (p, a = 0.2) => { if (!SHOTS) return; await ev(({ p, a }) => { walkTo(p, 0.3); faceA(a); game.camRig.lba.init = false; game.step(1.2); }, { p, a }); };
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.step(0.3); game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 74, timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
// (P83: the court moved with the School to its back terrace, unturned: its numbers here are the old court's, moved by
//  OWC.shift (offwall.js); OW_ holds the court's spots as the game has them)
let SH = { x: 0, z: 0 }, OW_ = null;
const Ct = (x, z) => ({ x: +(x + SH.x).toFixed(3), z: +(z + SH.z).toFixed(3) });
const helpers = () => ev(async () => {
  const { flight, OWC } = await import('/src/game/offwall.js');
  window.OWC = OWC;
  window.Ct = (x, z) => ({ x: +(x + OWC.shift.x).toFixed(3), z: +(z + OWC.shift.z).toFixed(3) });
  window.BASE ??= JSON.parse(JSON.stringify(game.flags));
  window.OW = () => game.story.offwall;
  window.CT = () => game.rooms.desert.offwall;
  window.ow = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('dx_ow_')));
  window.Dl = (p) => ({ x: 3400 + p.x, z: p.z });
  window.loc = (v) => (v ? [+(v.x - 3400).toFixed(2), +v.z.toFixed(2)] : null);
  window.tali = () => { const n = OW().tali(); return n ? { present: n.present, at: loc(n.pos) } : null; };
  window.court = () => { const C = CT(); return { bell: [C.bell.x, C.bell.z], board: [C.board.x, C.board.z, +(C.board.rot || 0).toFixed(2), !!C.board.down], standing: C.boardStanding(), stage: OW().stage(), mv: !!OW().mv }; };
  // the angle (rad) from where he stands whose throw does what `want` asks: the middle of the widest run (0.5° steps)
  window.aim = (want, beh = game.hero.behaviour) => {
    const G = game, h = G.hero, C = CT(), bw = C.W(C.bell.x, C.bell.z), g = OWC.g;
    const hit = (x, y, z) => Math.hypot(x - bw.x, z - bw.z) < 0.45 && y > g + 0.1 && y < g + 1.9;
    const runs = []; let run = [];
    for (let d = -180; d <= 180; d += 0.5) {
      const a = d * Math.PI / 180, r = flight(G, h.pos.x, h.pos.z, a, { beh, hit });
      const walls = r.hit ? r.contacts.filter((c) => c.kind === 'wall') : [], sand = r.hit ? r.contacts.some((c) => c.kind === 'ground') : false;
      const ok = !!r.hit && want({ walls: walls.length, sand, board: walls.some((c) => c.c === C.boardCol) });
      if (ok) run.push(a); else if (run.length) { runs.push(run); run = []; }
    }
    if (run.length) runs.push(run);
    runs.sort((p, q) => q.length - p.length);
    return runs.length ? { a: runs[0][runs[0].length >> 1], width: runs[0].length * 0.5, runs: runs.length } : null;
  };
  // INPUT: turn on the spot to face angle a, by the arrow keys (Classic: Left/Right; short taps at the end)
  window.faceA = (a) => {
    const G = game, h = G.hero, K = G.input.keys, norm = (x) => Math.atan2(Math.sin(x), Math.cos(x));
    for (let i = 0; i < 400; i++) {
      const d = norm(a - h.angle);
      if (Math.abs(d) < 0.006) break;
      K.delete('ArrowLeft'); K.delete('ArrowRight'); K.add(d > 0 ? 'ArrowLeft' : 'ArrowRight');
      G.step(Math.max(1 / 240, Math.min(1 / 30, Math.abs(d) / (Math.PI / 2) * 0.8)));
      K.delete('ArrowLeft'); K.delete('ArrowRight'); G.step(1 / 60);
    }
    P.release(); G.step(0.2);
    return +norm(a - h.angle).toFixed(4);
  };
  // INPUT: a quick throw (F); the ball's flight to its return; her word on it is left on screen (said() reads it)
  window.throwF = () => { const G = game, out = { rang: 0, walls: 0, sand: false }; const sv = G.audio.play.bind(G.audio); G.audio.play = (n, ...a) => { if (n === 'clang') out.rang++; return sv(n, ...a); };
    P.tap('KeyF', 0.05); for (let i = 0; i < 60 && G.state === 'play' && G.ball.state !== 'idle'; i++) G.step(0.1);
    const cs = G.ball.contacts || []; out.walls = cs.filter((c) => c.kind === 'wall').length; out.sand = cs.some((c) => c.kind === 'ground'); out.board = cs.some((c) => c.c === CT().boardCol);
    G.audio.play = sv; out.state = G.state; P.settle(); return out; };
  window.shoot = (want, beh) => { const A = aim(want, beh); if (!A) return { none: true, at: loc(game.hero.pos) }; const err = faceA(A.a); const r = throwF(); return { ...r, width: A.width, err, at: loc(game.hero.pos) }; };
  // INPUT: low on magic, he asks Tali (TALK): she tops it up (a player with an empty ball would)
  window.topUp = () => { const h = game.hero; if (h.mp >= 3) return null; const n = OW().tali(); const r = P.talk('ow_tali').r; return { r, mp: h.mp }; };
  window.saidP = () => { const s = (window._said || []).slice(); if (window._said) window._said.length = 0; return s; };   // (the lines said, read inside the page)
  window.walkTo = (p, tol = 0.25) => { const w = Dl(p); return P.go(w.x, w.z, { tol, maxT: 120 }).r; };
  window.waitMoves = (maxT = 60) => { let t = 0; while ((OW().mv || OW().tb || OW().seq) && t < maxT) { if (game.state === 'dialog') P.settle(); else game.step(0.1); t += 0.1; } P.settle(); return +t.toFixed(1); };
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    const keep = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('dx_')));
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), keep, { chapterKey: key }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
});
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 900000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded;
};
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};

await open(page, '?nocine'); await menu(page, 'new');
iso('chapter 3 finished by its flags (as tests/desert-life.mjs): the sealed shaft sends Twinsen to Desert Island (chapter 4)');
await ev(() => { const G = game; P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); P.settle();
  Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true });
  G.story.cur.toShell(); P.settle(); G.step(1.5); P.settle(); });
await helpers(); await said();
OW_ = await ev(() => JSON.parse(JSON.stringify(OWC))); SH = OW_.shift;
const a0 = await ev(() => ({ room: game.room?.id, ch: game.flags.chapterKey, built: !!CT(), tali: tali(), court: court(), ow: ow(), mp: game.hero.mp, beh: game.hero.behaviour }));
check('chapter 4 on Desert Island: Tali at her bell behind the School, the bell before the east block, the board lying in the sand; no dx_ow_ state yet', a0.room === 'desert' && a0.ch === 'dig' && a0.built && a0.tali?.present && Math.hypot(a0.tali.at[0] - OW_.tali.x, a0.tali.at[1] - OW_.tali.z) < 0.4 && a0.court.bell[0] === OW_.bell.c1.x && a0.court.board[3] && !a0.court.standing && a0.court.stage === 'pre' && Object.keys(a0.ow).length === 0, a0);

// ---------------------------------------------------------------- the walk; a straight throw before the rule
const w0 = await ev(() => { const G = game, h = G.hero; const p = Dl({ x: 4.1, z: -2.5 }); const go = P.go(p.x, p.z, { tol: 1.0, maxT: 400 }).r; const t0 = G.time; const w = Dl(Ct(-75.4, -80.4)); const r = P.go(w.x, w.z, { tol: 0.3, maxT: 200 }).r; return { go, r, secs: +(G.time - t0).toFixed(1), at: loc(h.pos) }; });
check('INPUT: Twinsen walks from before the School\'s door (the mask in S28\'s canyon) out of the canyon and round onto the terrace behind it (game seconds logged)', w0.r === 'arrived', w0);
await frame(Ct(-76.4, -82.2), 0.3); await shot('01-tali-and-her-court');
const d0 = await ev(() => { const r = shoot((o) => o.walls === 0); return { r, ow: ow(), stage: OW().stage() }; });
const d0l = await said();
check('INPUT: a straight throw at her bell before she has told him anything: it rings; "Hey! Not straight at my bell!"; the game not started', d0.r.rang >= 1 && d0.r.walls === 0 && d0.ow.dx_ow_direct === 1 && d0.stage === 'pre' && has(d0l, /Not straight at my bell/), { d0, d0l });

// ---------------------------------------------------------------- her rule and her demonstration
const t0 = await ev(() => { const G = game, out = { clang: 0 }; const sv = G.audio.play.bind(G.audio); G.audio.play = (n, ...a) => { if (n === 'clang') out.clang++; return sv(n, ...a); };
  out.r = P.talk('ow_tali').r; out.wait = waitMoves(60); out.met = !!G.flags.dx_ow_met; G.audio.play = sv; out.tali = tali(); return out; });
const t0l = await said();
check('INPUT: Tali (TALK): her game and its one rule (never straight); she walks to her ring and shows it: her ball off the wall into the bell; "stand in my ring, aim at my X"', t0.r === 'talked' && t0.met && t0.clang >= 1 && has(t0l, /one rule/) && has(t0l, /Never hit the bell straight/) && has(t0l, /aim at my X/) && has(t0l, /Everyone says that/), { t0, t0l });

// ---------------------------------------------------------------- game 1: off the wall
const g1 = await ev(() => { walkTo(OWC.ring1, 0.2); const straight = shoot((o) => o.walls === 0); return { straight, ow: ow() }; });
const g1l = await said();
check('INPUT, game 1: a straight hit from her ring rings the bell and is refused, kindly; nothing lost, the game still on', g1.straight.rang >= 1 && g1.straight.walls === 0 && !g1.ow.dx_ow_c1 && g1.ow.dx_ow_miss === 1 && has(g1l, /straight/i), { g1, g1l });
const m1 = await ev(() => { const err = faceA(Math.PI); const r = throwF(); return { r, err, ow: ow() }; });
await said();
check('INPUT, game 1: a throw at nothing (away from the wall) is a miss: counted, nothing else', m1.r.rang === 0 && m1.ow.dx_ow_miss === 2 && !m1.ow.dx_ow_c1, m1);
if (SHOTS) { await ev(() => { const A = aim((o) => o.walls >= 1); faceA(A.a); game.camRig.lba.init = false; game.step(1.0); window._mp = game.hero.mp; P.tap('KeyF', 0.05); for (let i = 0; i < 90 && !(game.ball.contacts || []).some((c) => c.kind === 'wall'); i++) game.step(1 / 30); for (let k = 0; k < 4; k++) game.step(1 / 30); }); await shot('02-rebound-in-flight'); await ev(() => { P.settle(); for (let i = 0; i < 60 && game.ball.state !== 'idle'; i++) game.step(0.1); P.settle(); }); }
const w1 = await ev(() => { if (OW().stage() !== 'c1') return { r: { rang: 1, walls: 1, shotThrow: true }, t: waitMoves(60), ow: ow(), court: court(), tali: tali() }; const r = shoot((o) => o.walls >= 1); const t = waitMoves(60); return { r, t, ow: ow(), court: court(), tali: tali() }; });
const w1l = await said();
check('INPUT, game 1 won: from her ring, off the white wall into the bell; "That\'s the game"; she carries the bell further out (game 2)', w1.r.rang >= 1 && w1.r.walls >= 1 && w1.ow.dx_ow_c1 && w1.court.stage === 'c2' && w1.court.bell[0] === OW_.bell.c2.x && w1.court.bell[1] === OW_.bell.c2.z && has(w1l, /That's the game/) && has(w1l, /clean/), { w1, w1l });

iso('Save & quit through the pause menu, then Continue (as a player)');
await saveQuit(); await reboot();
const s0 = await ev(() => ({ room: game.room?.id, ow: ow(), court: court(), tali: tali() }));
check('after Continue: game 2 in play, the bell where she put it, Tali at her place', s0.room === 'desert' && s0.court.stage === 'c2' && s0.court.bell[0] === OW_.bell.c2.x && s0.tali?.present && s0.ow.dx_ow_c1 && !s0.ow.dx_ow_c2, s0);

// ---------------------------------------------------------------- game 2: clean
const g2 = await ev(() => { topUp(); walkTo(OWC.ring1, 0.3); const sandy = shoot((o) => o.walls >= 1 && o.sand); return { sandy, ow: ow() }; });
const g2l = await said();
check('INPUT, game 2: from her ring the ball comes off the wall but touches the sand before the bell: refused ("Clean, I said" / "a bounce, not a shot")', g2.sandy.rang >= 1 && g2.sandy.walls >= 1 && g2.sandy.sand && !g2.ow.dx_ow_c2 && has(g2l, /sand/i), { g2, g2l });
await ev(() => { walkTo(Ct(-77.6, -77.4), 0.25); });
const w2 = await ev(() => { const r = shoot((o) => o.walls >= 1 && !o.sand); const t = waitMoves(80); return { r, t, ow: ow(), court: court() }; });
const w2l = await said();
check('INPUT, game 2 won: from closer to the wall, a clean one (off the wall, no sand); she carries the bell over and stands her board up beside it; "only one way" from her ring', w2.r.rang >= 1 && w2.r.walls >= 1 && !w2.r.sand && w2.ow.dx_ow_c2 && w2.court.stage === 'c3' && w2.court.bell[0] === OW_.bell.c3.x && w2.court.standing && w2.court.board[0] === OW_.board.c3.x && has(w2l, /Clean!/) && has(w2l, /only one way/), { w2, w2l });

// ---------------------------------------------------------------- game 3, her way first; then the board
const g3 = await ev(() => { topUp(); walkTo(OWC.ring3, 0.2); const r = shoot((o) => o.walls >= 1 && !o.board); return { r, ow: ow(), court: court() }; });
const g3l = await said();
check('INPUT, game 3 her way: from her ring, off the white wall just past the board\'s end; "That\'s my way!"; Twinsen: could it come off your board?; "Show me"', g3.r.rang >= 1 && g3.r.walls >= 1 && !g3.r.board && g3.ow.dx_ow_c3 === 'hers' && !g3.ow.dx_ow_moved && g3.court.stage === 'c3b' && has(g3l, /my way/) && has(g3l, /off your board/) && has(g3l, /Show me/), { g3, g3l });
const b3 = await ev(() => { const G = game; topUp(); walkTo(Ct(-80.0, -78.6), 0.25); const before = G.crystalCount?.() ?? null; const r = shoot((o) => o.walls >= 1 && o.board); const t = waitMoves(80); return { r, t, before, ow: ow(), court: court(), owed: G.flags.dx_owe_sc_trial ?? null, pick: G.pickups.list.filter((p) => p.id === 'sc-trial').map((p) => loc(p.pos)) }; });
const b3l = await said();
check('INPUT, the way she never thought of: off the board into the bell; "Off my board!"; she carries the board into the court; her prize (Rector Hougo\'s singing crystal) is tossed out', b3.r.rang >= 1 && b3.r.board && b3.ow.dx_ow_moved && b3.court.stage === 'court' && b3.court.board[0] === OW_.pBoard[0].x && b3.court.board[1] === OW_.pBoard[0].z && b3.court.standing && (b3.pick.length === 1 || b3.owed) && has(b3l, /Off my board/) && has(b3l, /singing crystal/) && has(b3l, /Move the board/), { b3, b3l });
await frame(Ct(-77.2, -82.6), 0.15); await shot('03-the-board-moved');
const c3 = await ev(() => { const G = game, p = G.pickups.list.find((q) => q.id === 'sc-trial'); if (p) P.go(p.pos.x, p.pos.z, { tol: 0.2, maxT: 30 }); for (let i = 0; i < 30; i++) G.step(0.1); P.settle(); return { has: G.collected.includes('sc-trial'), owed: G.flags.dx_owe_sc_trial ?? null, count: G.crystalCount?.() }; });
check('INPUT: the crystal picked up (once): sc-trial in hand, nothing owed', c3.has && !c3.owed, c3);

// ---------------------------------------------------------------- the court
const k0 = await ev(() => { const G = game, C = CT(); const b0 = court();
  const r1 = P.use(C.W(C.board.x, C.board.z - 0.5).x, C.board.z - 0.5, { kind: 'dx_ow_board', near: 0.6 }).r; const t1 = waitMoves(40);
  const b1 = court();
  const lb = C.W(C.bell.x + OWC.POST, C.bell.z);
  const r2 = P.use(lb.x, lb.z, { kind: 'dx_ow_bell', near: 0.6 }).r; const t2 = waitMoves(40);
  return { b0, r1, t1, b1, r2, t2, b2: court(), ow: ow() }; });
await said();
check('INPUT, the court: the board (E, his hands on it) carried to its next spot; the bell (E) to its next; both saved', k0.r1 === 'used' && k0.b1.board[0] === OW_.pBoard[1].x && k0.b1.standing && k0.r2 === 'used' && k0.b2.bell[0] === OW_.pBell[1].x && k0.ow.dx_ow_bspot === 1 && k0.ow.dx_ow_lspot === 1, k0);
const k1 = await ev(() => { walkTo(Ct(-77.5, -80.5), 0.3); const toasts = []; const sv = game.hud.toast.bind(game.hud); game.hud.toast = (k, v, ...a) => { toasts.push(k); return sv(k, v, ...a); };
  const reb = shoot((o) => o.walls >= 1); const str = shoot((o) => o.walls === 0); game.hud.toast = sv; return { reb, str, toasts, ow: ow() }; });
await said();
check('INPUT, the court: a ring off the wall counts under his name on her board (the toast); a straight one does not', k1.reb.rang >= 1 && k1.ow.dx_ow_rings === 1 && k1.toasts.includes('ow_toast_ring') && k1.toasts.includes('ow_toast_direct'), k1);
const r0 = await ev(() => { const G = game, h = G.hero; walkTo(Ct(-77.5, -82.5), 0.3); faceA(Math.PI); let n = 0; while (h.mp >= 1 && n++ < 20) throwF(); saidP();
  const dud = throwF(); for (let i = 0; i < 20 && game.state === "play"; i++) game.step(0.1); P.settle(); const dl = saidP(); const r = P.talk('ow_tali').r; return { n, dud, dl, r, mp: h.mp, max: h.mpMax }; });
const r0l = await said();
check('INPUT: the ball emptied of magic by throws; a throw with none drops (no rebound) and Tali says so; talking to her tops it up (a pupil\'s first spell)', r0.dud.walls === 0 && r0.dl.some((l) => /out of magic/.test(l)) && r0.r === 'talked' && r0.mp === r0.max && has(r0l, /tired/), { r0, r0l });

// ---------------------------------------------------------------- game 3 the other way (fresh, by flags)
iso('a fresh game 3 by its flags (games 1 and 2 won, nothing else): the board first');
const u0 = await ev(() => { const G = game, f = G.flags; for (const k of Object.keys(f)) if (k.startsWith('dx_ow_')) delete f[k]; Object.assign(f, { dx_ow_met: true, dx_ow_c1: true, dx_ow_c2: true }); G.story.applyFlags(); G.step(0.3); P.settle();
  walkTo(Ct(-80.0, -78.6), 0.25); const r = shoot((o) => o.walls >= 1 && o.board); const t = waitMoves(80); return { r, t, ow: ow(), court: court() }; });
const u0l = await said();
check('INPUT, game 3 the board first: the surprise at once ("Off my board!"; she moves it; the court); recorded as the board', u0.r.rang >= 1 && u0.r.board && u0.ow.dx_ow_c3 === 'board' && u0.ow.dx_ow_moved && u0.court.stage === 'court' && has(u0l, /Off my board/) && !has(u0l, /my way!/), { u0, u0l });
await ev(() => { game.flags.dx_ow_rings = 4; OW().applyWorld(); });

// ---------------------------------------------------------------- later chapters
for (const [key, re] of [['observatory', /Joss plays now/], ['network', /Rector Hougo had a go/], ['home', /gone quiet/]]) {
  iso(`chapter ${key} by its flags; on Desert Island at the court`);
  const cx = await ev(({ key }) => { setChapter(key); const G = game; G.regions.ensure('desert', 'test'); if (G.room?.id !== 'desert') { G.enterRoom('desert', { ...Dl(Ct(-76, -82)), a: 0 }, true); P.settle(); } else walkTo(Ct(-76, -82), 0.5);
    G.story.refreshCast(); G.step(0.5); P.settle(); walkTo(Ct(-75.0, -82.4), 0.4);
    const out = { tali: tali(), court: court(), ow: ow() };
    out.r = P.talk('ow_tali').r;
    let thrown = 0; const sv = G.audio.play.bind(G.audio); G.audio.play = (n, ...a) => { if (n === 'clang') thrown++; return sv(n, ...a); };
    walkTo(Ct(-78, -83.6), 0.5); for (let i = 0; i < 300 && !thrown; i++) G.step(0.1); G.audio.play = sv; out.taliRang = thrown; out.plan = !!OW()._plan;
    return out; }, { key });
  const cxl = await said();
  check(`${key}: the court as he left it (the board standing in the court, his score); Tali at her bell, her line for this part of the story; she practises (her ball rings it)`, cx.tali?.present && cx.court.stage === 'court' && cx.court.standing && cx.r === 'talked' && has(cxl, re) && cx.taliRang >= 1, { cx, cxl });
  if (key === 'observatory') { await frame(Ct(-75.6, -83.0), 0.1); await shot('04-chapter7-court'); }
}

// text: English, short, no night words in any new line
const tx = await ev(async () => { const { STR } = await import('/src/game/i18n.js'); const keys = Object.keys(STR.en).filter((k) => /^(ow_|n_ow_)/.test(k)); const all = keys.flatMap((k) => [].concat(STR.en[k])); return { n: keys.length, bad: all.filter((s) => /\b(night|evening|tonight|sunset|dawn|dusk)\b/i.test(s)), long: all.filter((s) => s.split(/(?<=[.!?])\s+/).length > 3), hebrew: all.filter((s) => /[֐-׿]/.test(s)) }; });
check('the quest\'s text: English; no night, evening, tonight, sunset, dawn or dusk; no line of more than three sentences', tx.n > 50 && tx.bad.length === 0 && tx.long.length === 0 && tx.hebrew.length === 0, tx);
await browser.close();

// ---------------------------------------------------------------- old saves (from before this change)
for (const [fx, key] of [['base-07-dig', 'dig'], ['new-13-desert', 'network'], ['base-12', 'council']]) {
  ({ browser, page } = await launch({ scale: 1 }));
  const st = JSON.parse(fs.readFileSync(FIX(fx), 'utf8'));
  const raw = st.origins.flatMap((o) => o.localStorage).find((i) => i.name === 'lba3_save_v1').value;
  await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers();
  const o = await ev(() => { const G = game; const st0 = G.state, ow0 = ow(); G.regions.ensure('desert', 'test'); if (G.room?.id !== 'desert') { G.enterRoom('desert', { ...Dl(Ct(-76, -82)), a: 0 }, true); P.settle(); }
    G.story.refreshCast(); G.step(1); P.settle();
    return { state: st0, ch: G.flags.chapterKey, ow0, ow: ow(), tali: tali(), court: court() }; });
  check(`an old save (${fx}, chapter ${key}, before this change) loads: in play; no dx_ow_ state made up; Tali at her bell, the game not started, the board lying`, o.state === 'play' && o.ch === key && Object.keys(o.ow0).length === 0 && Object.keys(o.ow).length === 0 && o.tali?.present && o.court.stage === 'pre' && !o.court.standing, o);
  await browser.close();
}
done();
