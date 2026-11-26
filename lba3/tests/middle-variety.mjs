// MIDDLE-VARIETY (REVIEW-TASKS-19-11 task 6): the middle chapters' changed sequences.
// Chapter 8, the depot bunker (story/evacuation.js): the ball turns the hatch wheel, the door rolls a hand's width and
// sticks on a bar dropped inside; Lulu (the small one) slips through the gap and lifts it.
// Staged: the story's own flags jump to chapter 8 with Gilbert asked (as tests/chapter8.mjs does); the hero then walks,
// throws and talks by input (tests/lib/player.js: keys, A* on the game's collision, no teleports).
//   A. the wheel first, the children on the quay: a look at the shut door; the throw (the gap, not open); a second throw
//      (it only jerks: still shut); a look at the gap; save → Continue (the door still ajar, the wheel no target);
//      Lulu asked on the quay, the children go to the door; Lulu slips in; the door opens with her in it; the journal.
//   B. Pippa first (the children already at the door with her cart): the throw, Tim and Lulu at the door, open.
//   C. an older save with the depot open (no c8_gap): the door open, the journal's old line.
// Run: GAME_URL=http://localhost:<port>/ node tests/middle-variety.mjs
import { launch, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
const boot = async (mode) => {
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  await page.evaluate(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => {
    const G = window.game; G.testFreeze = true;
    const said = (window.SAID = []), toasts = (window.TOASTS = []);
    const say0 = G.say.bind(G), toast0 = G.hud.toast.bind(G.hud);
    G.say = (name, lines, ...rest) => { said.push(String(name) + ': ' + [].concat(lines).join(' ')); return say0(name, lines, ...rest); };
    G.hud.toast = (k, ...rest) => { toasts.push(k); return toast0(k, ...rest); };
    window.T = {
      ch() { return G.story.chapters.find((c) => c.key === 'evacuation'); },
      door() { return T.ch().depotDoor; },
      obj() { return document.querySelector('#pause-objective')?.textContent || ''; },
      journal() { return G.story.journal().flatMap((s) => s.lines || []).map((l) => l.key); },
      said(from) { return window.SAID.slice(from); },
      near(id, p, r) { const n = G.npcs.find((x) => x.def.id === id); return !!n?.present && Math.hypot(n.pos.x - p.x, n.pos.z - p.z) < r; },
      // the hero walks (by input) to a few metres from the wheel, faces it and throws
      throwWheel() { const w = T.ch().wheelSpot, a0 = window.TOASTS.length; for (const s of [0, -1.2, 1.2, -2.4, 2.4, 0]) { const p = T.door().at(4, s); P.go(p.x, p.z, { tol: 0.8, run: true, maxT: 90 }); P.settle(); P.tap('Digit1'); P.throwAt(w.x, w.z); P.settle(); if (!!G.flags.c8_gap !== T.before || window.TOASTS.length > a0) break; } },
    };
  });
};
// chapter 8 from the end of chapter 7, home done, Gilbert asked (extra: more of the chapter's flags)
const toDepot = (extra) => ev((extra) => { const G = game; P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 6, chapterKey: 'observatory', c1_water: true, c1_done: true, c7_started: true, c7_vent: true, c7_done: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle(); P.settle();
  Object.assign(G.flags, { c8_home: true, c8_gilbert: true, c8_fort: true }, extra);
  G.story.applyFlags?.(); G.story.refreshCast(); G.step(0.5); P.settle(); G.updateObjective();
  const D = T.ch();
  return [G.flags.chapterKey, G.state, +D.depotDoor.p.toFixed(2), D.ballTargets().length]; }, extra);

// ================================================================ A. the wheel first, the children on the quay
await boot('new');
is('A: chapter 8 at the depot step: the door shut, the wheel a ball target', await toDepot({}), (v) => v[0] === 'evacuation' && v[1] === 'play' && v[2] === 0 && v[3] === 1);
is('A: a look at the shut door: the wheel is too high by hand (nothing opens)', await ev(() => { const D = T.ch(), p = D.depotDoor.at(1.9, 0), n = window.SAID.length;
  const r = P.use(p.x, p.z, { run: true, kind: 'c8hatch' }); P.settle(); return [r.r, T.said(n).join(' | '), !!game.flags.c8_gap]; }), (v) => /too high/i.test(v[1]) && !v[2]);
let n0 = await ev(() => window.SAID.length);
is('A: the throw (input): the wheel turns, the door rolls a hand\'s width and sticks; not open', await ev(() => { T.before = !!game.flags.c8_gap; T.throwWheel(); game.step(2.0); const D = T.ch();
  return [!!game.flags.c8_gap, !!game.flags.c8_depot, +D.depotDoor.p.toFixed(2), D.ballTargets().length]; }), (v) => v[0] && !v[1] && v[2] === 0.25 && v[3] === 1);
is('A: his line names the bar and the gap', await ev((n) => T.said(n), n0), (v) => v.some((s) => /hand's width/.test(s) && /bar/.test(s)));
is('A: the objective now asks for someone small', await ev(() => { game.updateObjective(); return T.obj(); }), (v) => /Someone small could slip in and lift the bar/.test(v));
is('A: a second throw (a reasonable wrong try): the door jerks against the bar, says so, stays at a hand\'s width', await ev(() => { const a0 = window.TOASTS.length; T.before = true; T.throwWheel(); game.step(1.0);
  return [window.TOASTS.slice(a0), !!game.flags.c8_depot, +T.ch().depotDoor.p.toFixed(2)]; }), (v) => v[0].includes('c8_toast_bar') && !v[1] && v[2] === 0.25);
is('A: a look at the gap: too narrow for him, someone small could slip through', await ev(() => { const D = T.ch(), p = D.depotDoor.at(1.9, 0), n = window.SAID.length;
  P.use(p.x, p.z, { kind: 'c8hatch' }); P.settle(); return T.said(n).join(' | '); }), (v) => /too narrow for me/.test(v) && /small/.test(v));
// save halfway (the door stuck, nobody asked yet), Continue
await ev(() => game.save(false));
await boot('continue');
is('A: save → Continue: the door still ajar on its bar, not open; the children on the quay', await ev(() => { const G = game; G.step(0.5); P.settle(); const D = T.ch();
  return [G.flags.chapterKey, !!G.flags.c8_gap, !!G.flags.c8_depot, +D.depotDoor.p.toFixed(2), D.ballTargets().length, T.near('lulu', D.depotDoor.at(1.5, 0), 8)]; }),
  (v) => v[0] === 'evacuation' && v[1] && !v[2] && v[3] === 0.25 && v[4] === 1 && !v[5]);
n0 = await ev(() => window.SAID.length);
is('A: Lulu asked on the quay (input): "I\'m the small one"; he walks back to the depot, and the children are there', await ev(() => { const G = game; P.talk('lulu', { run: true }); P.settle(); G.step(1.0);
  const D = T.ch(), q = D.depotDoor.at(4, 0); P.go(q.x, q.z, { tol: 0.8, run: true, maxT: 120 }); P.settle(); for (let i = 0; i < 300 && !(T.near('lulu', D.depotDoor.at(1.5, 0), 6) && T.near('tim', D.depotDoor.at(1.5, 0), 6)); i++) G.step(0.2);
  return [!!G.flags.c8_kids, T.near('lulu', D.depotDoor.at(1.5, 0), 6), T.near('tim', D.depotDoor.at(1.5, 0), 6), !!G.flags.c8_depot]; }), (v) => v[0] && v[1] && v[2] && !v[3]);
is('A: their lines', await ev((n) => T.said(n), n0), (v) => v.some((s) => /small one/.test(s)) && v.some((s) => /strong one/.test(s)));
n0 = await ev(() => window.SAID.length);
is('A: at the door Lulu slips in: the bar comes up and the door rolls open with her standing in it', await ev(() => { const G = game; P.talk('lulu', { run: true }); P.settle();
  for (let i = 0; i < 120 && !G.flags.c8_depot; i++) G.step(0.1); P.settle(); G.step(2.0); P.settle(); const D = T.ch();
  return [!!G.flags.c8_depot, +D.depotDoor.p.toFixed(2), T.near('lulu', D.depotDoor.at(0.5, -0.8), 1.2)]; }), (v) => v[0] && v[1] === 1 && v[2]);
is('A: what was said: the bunker\'s inside, Lulu\'s spider', await ev((n) => T.said(n), n0), (v) => v.some((s) => /benches, old lamps/.test(s)) && v.some((s) => /spider/.test(s)));
is('A: with Mira and Pippa done, the journal tells it with Lulu', await ev(() => { Object.assign(game.flags, { c8_mira: true, c8_pippa: true }); return T.journal(); }), (v) => v.includes('c8_j_shelters2') && !v.includes('c8_j_shelters'));
await ev(() => game.save(false));
await boot('continue');
is('A: save → Continue after: the door open, Lulu in the doorway', await ev(() => { game.step(0.5); P.settle(); const D = T.ch(); return [!!game.flags.c8_depot, +D.depotDoor.p.toFixed(2), T.near('lulu', D.depotDoor.at(0.5, -0.8), 1.2)]; }), (v) => v[0] && v[1] === 1 && v[2]);

// ================================================================ B. Pippa first: the children already at the door
await boot('new');
is('B: Pippa asked first: Tim and Lulu by the depot door with her cart; the door shut', await toDepot({ c8_pippa: true }), (v) => v[0] === 'evacuation' && v[2] === 0);
is('B: the throw: stuck at a hand\'s width', await ev(() => { T.before = false; T.throwWheel(); game.step(2.0); return [!!game.flags.c8_gap, !!game.flags.c8_depot, T.near('tim', T.ch().depotDoor.at(1.5, 0), 6)]; }), (v) => v[0] && !v[1] && v[2]);
n0 = await ev(() => window.SAID.length);
is('B: Tim at the door: "not me, I\'m the strong one"; Lulu slips in; the door opens', await ev(() => { const G = game; P.talk('tim', { run: true }); P.settle();
  for (let i = 0; i < 120 && !G.flags.c8_depot; i++) G.step(0.1); P.settle(); G.step(2.0); return [!!G.flags.c8_depot, !!G.flags.c8_kids, +T.ch().depotDoor.p.toFixed(2)]; }), (v) => v[0] && !v[1] && v[2] === 1);
is('B: the three lines at the door', await ev((n) => T.said(n), n0), (v) => v.some((s) => /Who fits through/.test(s)) && v.some((s) => /strong one/.test(s)) && v.some((s) => /Back in a second/.test(s)));

// ================================================================ C. an older save: the depot opened by the old throw
await boot('new');
is('C: an older save with the depot open and no c8_gap: the door open, the journal\'s old line', await ev(async () => { const G = game; P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 6, chapterKey: 'observatory', c1_water: true, c1_done: true, c7_started: true, c7_vent: true, c7_done: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle();
  Object.assign(G.flags, { c8_home: true, c8_gilbert: true, c8_fort: true, c8_depot: true, c8_mira: true, c8_pippa: true });
  G.story.applyFlags?.(); G.story.refreshCast(); G.step(0.5); P.settle();
  return [+T.ch().depotDoor.p.toFixed(2), T.journal().includes('c8_j_shelters'), T.journal().includes('c8_j_shelters2'), T.ch().ballTargets().length]; }), (v) => v[0] === 1 && v[1] && !v[2] && v[3] === 0);

await browser.close();
done();
