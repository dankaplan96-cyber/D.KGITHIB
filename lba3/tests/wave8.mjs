// WAVE 8 (docs/lba-maturity/WAVE8.md; CONTENT-15H.md §3 H-19, H-20; src/game/story/wave8.js, wave8world.js): four
// secrets each opened by a behaviour, and the world noticing deeds done. One covering suite, played by input where it
// says INPUT (tests/lib/player.js: walking, E, behaviour keys F1–F4, Space, a kick, talk) from the campaign's own save
// made before wave 8 (tests/fixtures/campaign/base-13-cit: chapter 14 on Citadel, every region open; format 5), loaded
// through Continue as a player would:
//   L  the old save loads (format 6; no w8 state made up but the news order, read from the deeds' own flags)
//   D  Discreet · Zeelich: the dog asleep on the cellar hatch; walked at in Normal (INPUT): it wakes ("!"), the woke line,
//      the hatch looked at ("Soft feet might not"); walked off: asleep again; Discreet (F4), sneaked up (INPUT): it
//      sleeps on, the hatch (E): the tin, 20 kashes once; Save & quit -> Continue: kept, the cellar empty
//   A  Athletic · Desert Island: the ledge looked at from below (E); in Normal he can't get up on the flat rock (INPUT:
//      walked into it); Athletic (F2), a jump onto the flat rock, a jump across the gap onto the ledge (INPUT, Space);
//      the satchel (E): a Meca-Penguin; a second visit: nothing more
//   C  Aggressive · the Hamalayi: both ends of the steps reached on foot the long way (planned walk length logged); the
//      arch (E in Normal): the look; Aggressive (F3): E kicks it open; the steps (E): up to Lhar's terrace, the grate
//      unbolted; the grate (E): back down; Save & quit -> Continue: open, both ways
//   Q  Normal · Citadel: the slate by Bersimon's tent (E); in the tent (INPUT, by its door) Bersimon's own stories first,
//      then in Athletic his "gallop" word; in Normal (F1) the old wizards' saying, once; the journal's section
//   N  the news: a Citadel notice board (E) before any deed (ISO: the deed flags cleared): the town's notice only; two
//      deeds done (ISO, in order): the board's notice, then the news sheet, the newest headline first; read again: the
//      older one; an isles' shuttle board on Otringal and Otringal's unattended stall (E): THE CLOUD CRIER
//   E  the ending's free play (ISO: the chapter key 'home', the dinner done): the journal's open favours (a started
//      story listed, a finished one not) and who would like a word; Pippa (TALK): her thank-you and an apple (life back),
//      once; again: her own line; the journal no longer names her
//   O  every wave-8 piece, in each state it shows, scanned with the overlap sweep's library (tests/lib/sweep.js): no
//      finding names a wave-8 piece
// ISO (logged): a region reached by the travel network's own move; flags set where the step says. ONLY=LDACQNEO runs
// parts. SHOTS=dir writes the pictures (the play camera; before = the same frame with this wave's pieces hidden).
// SERVE=1 answers this checkout's files by request routing. Automated runtime only (SwiftShader, headless Chromium).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const SWEEP = fileURLToPath(new URL('./lib/sweep.js', import.meta.url));
const FIX = (n) => fileURLToPath(new URL(`./fixtures/campaign/${n}.save.json`, import.meta.url));
const ONLY = process.env.ONLY || 'LDACQNEO';
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let browser, page;
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 300000 }); };
const pair = async (n, hide) => { if (!SHOTS) return; await ev(hide, true); await shot(n + '-before'); await ev(hide, false); await shot(n + '-after'); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(async () => {
  const G = game, I = G.input;
  const m = await import('/src/game/wave8world.js'); window.W8 = m.W8;
  const s = await import('/src/game/story/wave8.js'); window.S8 = s;
  const nm = await import('/src/game/noticemark.js'); window.NM = nm;
  window.w8 = () => Object.fromEntries(Object.entries(G.flags).filter(([k]) => k.startsWith('w8')));
  window.r2 = (v) => +(+v).toFixed(2);
  window.goRegion = (id, x, z, a = 0) => { if (id === 'citadel') { if (G.room) G.exitRoom({ x, z, a }, true); else { G.hero.pos.set(x, G.physics.groundAt(x, z, 60), z); G.hero.angle = a; } } else { G.regions.ensure(id, 'test'); const R = G.rooms[id]; G.enterRoom(id, x == null ? R.spawn : { x, z, a }, true); } G.story.refreshCast(); P.settle(); G.step(0.3); return G.room?.id ?? 'citadel'; };
  window.beh = (b) => { const k = { normal: 'F1', athletic: 'F2', aggressive: 'F3', discreet: 'F4' }[b]; if (G.hero.behaviour !== b) P.tap(k, 0.05); return G.hero.behaviour; };
  // a jump by input: face the spot, run at it (ArrowUp held), Space when `at` m short of it; hold on until he lands
  window.jumpTo = (tx, tz, at) => {
    const h = G.hero; P.face(tx, tz);
    I.keys.add('ArrowUp'); let t = 0, jumped = false, air = false, maxY = h.pos.y;
    while (t < 4) {
      G.step(1 / 60); t += 1 / 60; maxY = Math.max(maxY, h.pos.y);
      const d = Math.hypot(tx - h.pos.x, tz - h.pos.z);
      const diff = Math.atan2(Math.sin(Math.atan2(tx - h.pos.x, tz - h.pos.z) - h.angle), Math.cos(Math.atan2(tx - h.pos.x, tz - h.pos.z) - h.angle));
      I.keys.delete('ArrowLeft'); I.keys.delete('ArrowRight'); if (Math.abs(diff) > 0.06 && !jumped) I.keys.add(diff > 0 ? 'ArrowLeft' : 'ArrowRight');
      if (!jumped && d < at) { I.keys.add('Space'); I.taps.add('Space'); G.step(1 / 60); I.keys.delete('Space'); jumped = true; }
      if (jumped && !h.onGround) air = true;
      if (air && h.onGround) break;
    }
    P.release(); G.step(0.3);
    return { jumped, air, y: r2(h.pos.y), maxY: r2(maxY), on: h.onGround };
  };
  window.planLen = (x0, z0, x1, z1) => { const h = G.hero; const p0 = h.pos.clone(); h.pos.set(x0, G.physics.groundAt(x0, z0, 60), z0); G.step(0.03); const p = P.plan(x1, z1, { tol: 1.0, maxNodes: 150000, cell: 0.6 }); h.pos.copy(p0); G.step(0.03); return p.ok ? Math.round(p.pts.reduce((s, q, i, A) => s + (i ? Math.hypot(q.x - A[i - 1].x, q.z - A[i - 1].z) : 0), 0)) : -1; };
  window.items = () => [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span')?.textContent || b.textContent);
  window.jsec = (re) => G.story.journal().find((s) => re.test(s.title));
});
const boot = async (fixture) => {
  ({ browser, page } = await launch({ scale: 1 }));
  const st = JSON.parse(fs.readFileSync(FIX(fixture), 'utf8'));
  const raw = st.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'lba3_save_v1')?.value;
  await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};
// (Save & quit lands on the title; Continue is pressed as a player would)
const reboot = async (cont) => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  if (cont) await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 60 && game.state !== 'play'; i++) game.step(0.1); for (let i = 0; i < 20; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 600000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded; await reboot(true);
};

await boot('base-13-cit');

// ================================================================ L · the old save
if (ONLY.includes('L')) {
  const l0 = await ev(() => ({ v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, ch: game.flags.chapterKey, w8: Object.keys(w8()) }));
  check('L: the campaign\'s chapter-14 save from before wave 8 (format 5) loads through Continue: format 6, in play, no w8 state made up (the news order, w8n_seen, is read from deeds already done)', l0.v === 6 && l0.state === 'play' && l0.ch === 'network' && l0.w8.every((k) => k === 'w8n_seen'), l0);
}

// ================================================================ D · Discreet: the dog on the cellar hatch (Zeelich)
if (ONLY.includes('D')) {
  iso('to Zeelich by the travel network\'s own move: 9 m from the hatch, in Normal');
  const d0 = await ev(() => { const H = W8.hatch; goRegion('zeelich', H.leafAt.x + 8, H.leafAt.z - 0.6, 0); beh('normal'); for (let i = 0; i < 20; i++) game.step(0.05); return { state: H.state, zzz: H.zzz.visible, coins: game.hero.coins }; });
  await pair('wave8-01-dog', (h) => { const H = W8.hatch; H.grp.visible = !h; });
  const d1 = await ev(() => { const H = W8.hatch, L = H.leafAt; const r = P.go(L.x + 0.9, L.z - 0.3, { tol: 0.4, maxT: 20 }); P.settle(); return { r: r.r, state: H.state, woke: !!game.flags.w8d_woke, marks: NM.shown([H.mark]), d: r2(Math.hypot(game.hero.pos.x - H.dog.x, game.hero.pos.z - H.dog.z)) }; });
  const d1l = await said();
  check('D: walked up to the hatch in Normal (INPUT): the dog wakes before he gets there ("!" over it), sits up on the hatch; Twinsen: "it hears a boot from across the street"', d0.state === 'sleep' && d0.zzz && d1.state === 'awake' && d1.woke && has(d1l, /hears a boot/), { d0, d1, d1l });
  const d2 = await ev(() => { const H = W8.hatch, L = H.leafAt; const u = P.use(L.x, L.z, { kind: 'w8d_look', near: 0.8 }); return { u: u.r, done: !!game.flags.w8d_done }; });
  const d2l = await said();
  check('D: the hatch with the dog awake (E): only a look — "Big feet wake it. Soft feet might not."', d2.u === 'used' && !d2.done && has(d2l, /Soft feet might not/), { d2, d2l });
  await shot('wave8-02-dog-awake');
  const d3 = await ev(() => { const H = W8.hatch; P.go(H.leafAt.x + 8, H.leafAt.z - 0.6, { tol: 0.6 }); let k = 0; while (H.state !== 'sleep' && k++ < 120) game.step(0.1); return { state: H.state, t: k / 10 }; });
  check('D: walked off 9 m (INPUT): it settles and sleeps again after a few seconds', d3.state === 'sleep', d3);
  const d4 = await ev(() => { const G = game, H = W8.hatch, L = H.leafAt; beh('discreet'); const c0 = G.hero.coins; const r = P.go(L.x + 0.9, L.z - 0.3, { tol: 0.35, maxT: 60 }); const st = H.state, mk = NM.shown([H.mark]); const u = P.use(L.x, L.z, { kind: 'w8d_hatch', near: 0.7 }); for (let i = 0; i < 30; i++) G.step(0.05); P.settle(); return { r: r.r, st, mk, u: u.r, after: H.state, beh: G.hero.behaviour, done: !!G.flags.w8d_done, got: G.hero.coins - c0 }; });
  const d4l = await said();
  check('D: in Discreet (F4) sneaked up the same way (INPUT): it sleeps on; the hatch (E, "Lift the hatch"): an old tobacco tin, 20 kashes, the note; the dog still asleep', d4.beh === 'discreet' && d4.st === 'sleep' && d4.u === 'used' && d4.done && d4.got === 20 && d4.after === 'sleep' && has(d4l, /tobacco tin/) && has(d4l, /RAINY DAY/), { d4, d4l });
  const d5 = await ev(() => { const H = W8.hatch, L = H.leafAt, c0 = game.hero.coins; const u = P.use(L.x, L.z, { near: 0.7 }); return { u: u.r, got: game.hero.coins - c0, tg: u.target?.kind }; });
  const d5l = await said();
  check('D: the hatch again (E): the cellar is empty, nothing more given', d5.got === 0 && has(d5l, /cellar's empty/), { d5, d5l });
  await saveQuit();
  const d6 = await ev(() => ({ room: game.room?.id, w8: w8(), state: W8.hatch?.state, coins: game.hero.coins }));
  check('D: Save & quit -> Continue: the cellar stays emptied (w8d_done), the dog asleep on its hatch', d6.w8.w8d_done && d6.w8.w8d_woke && d6.state === 'sleep', d6);
}

// ================================================================ A · Athletic: the ledge with a gap (Desert Island)
if (ONLY.includes('A')) {
  iso('to Desert Island by the travel network\'s own move, 6 m from the flat rock, in Normal');
  const a0 = await ev(() => { const L = W8.ledge; goRegion('desert', L.low.x - 6, L.low.z, Math.PI / 2); beh('normal'); return { pen: game.hero.arms?.penguins ?? 0, low: r2(L.low.top), high: r2(L.high.top), ground: r2(game.physics.terrain.heightAt(L.x, L.z)) }; });
  await pair('wave8-03-ledge', (h) => { W8.ledge.grp.visible = !h; });
  const a1 = await ev(() => { const L = W8.ledge; const u = P.use(L.high.x, L.high.z, { kind: 'w8a_look', near: 1.6, match: 3 }); return { u: u.r, seen: !!game.flags.w8a_seen }; });
  const a1l = await said();
  check('A: the ledge looked at from below (E): "A satchel up on that ledge… From the flat rock, with a jump, maybe."', a1.u === 'used' && a1.seen && has(a1l, /From the flat rock/), { a1, a1l });
  const a2 = await ev(() => { const G = game, h = G.hero, L = W8.ledge; beh('normal'); P.go(L.low.x - 2.2, L.low.z, { tol: 0.3 }); P.face(L.low.x, L.low.z); G.input.keys.add('ArrowUp'); let maxY = h.pos.y; for (let i = 0; i < 90; i++) { G.step(1 / 30); maxY = Math.max(maxY, h.pos.y); } P.release(); const sp = (() => { P.tap('Space', 0.6); return r2(h.pos.y); })(); return { maxY: r2(maxY), low: r2(L.low.top), afterSpace: sp }; });
  check('A: in Normal (INPUT: walked into the flat rock for 3 s, Space = a hop on the spot) he stays on the sand: the rock is above a walker\'s step', a2.maxY < a2.low - 0.4 && a2.afterSpace < a2.low - 0.4, a2);
  // (the first jump from beside the flat rock's rim: he lands near that rim, which leaves the rock's width as the run-up
  //  for the jump over the gap from its far edge)
  const a3 = await ev(() => { const G = game, L = W8.ledge; P.go(L.low.x - 3.0, L.low.z, { tol: 0.3 }); beh('athletic'); const j1 = jumpTo(L.low.x, L.low.z, 1.5); const onLow = Math.abs(G.hero.pos.y - L.low.top) < 0.15; P.face(L.high.x, L.high.z); const back = r2(Math.hypot(G.hero.pos.x - L.high.x, G.hero.pos.z - L.high.z)); const j2 = jumpTo(L.high.x, L.high.z, 3.0); return { j1, onLow, back, j2, high: r2(L.high.top), beh: G.hero.behaviour }; });
  check('A: Athletic (F2): a running jump onto the flat rock (1.05 m), then from it a jump across the 2 m gap onto the ledge (2.15 m) (INPUT, Space)', a3.beh === 'athletic' && a3.onLow && a3.j2.on && Math.abs(a3.j2.y - a3.high) < 0.15, a3);
  await shot('wave8-04-on-ledge');
  const a4 = await ev(() => { const L = W8.ledge, A = game.hero.arms; const p0 = A.penguins ?? 0, d0 = A.darts ?? 0; const u = P.use(L.bagAt.x, L.bagAt.z, { kind: 'w8a_take', near: 0.5 }); return { u: u.r, done: !!game.flags.w8a_done, pen: (A.penguins ?? 0) - p0, darts: (A.darts ?? 0) - d0, bag: L.sat.visible, full: p0 >= 5 }; });
  const a4l = await said();
  check('A: the satchel on the ledge (E): a Meca-Penguin (five darts if the pockets were full); the satchel gone', a4.done && !a4.bag && (a4.full ? a4.darts > 0 : a4.pen === 1) && has(a4l, /Meca-Penguin/), { a4, a4l });
  const a5 = await ev(() => { const L = W8.ledge; const tg = P.target(); return { tg: tg?.kind ?? null }; });
  check('A: on the ledge again: nothing more to take (no prompt)', a5.tg !== 'w8a_take', a5);
}

// ================================================================ C · Aggressive: the bricked arch and the steps (the Hamalayi)
if (ONLY.includes('C')) {
  iso('to the Hamalayi by the travel network\'s own move: the valley floor south of Lhar, 5 m before the arch, in Normal');
  const c0 = await ev(() => { const A = W8.arch; goRegion('hamalayi', A.up.x, A.up.z + 4, Math.PI); beh('normal'); const walk = planLen(A.up.x, A.up.z, A.out.x, A.out.z); return { walk, foot: r2(A.foot.y), top: r2(A.top.y), open: !!game.flags.w8c_open }; });
  check('C: both ends of the steps are reached on foot the long way (the test planner, from the arch\'s foot to the grate on Lhar\'s terrace): the steps open nothing that was shut', c0.walk > 60 && !c0.open, c0);
  await pair('wave8-05-arch', (h) => { W8.arch.grp.visible = !h; W8.arch.gg.visible = !h; });
  const c1 = await ev(() => { const A = W8.arch; const u = P.use(A.door.x, A.door.z, { kind: 'w8c_arch', near: 0.9 }); return { u: u.r, open: !!game.flags.w8c_open, seen: !!game.flags.w8c_seen, label: null }; });
  const c1l = await said();
  check('C: the arch in Normal (E): a look — bricked up, the mortar cracked, "It might give to a good kick"; still shut', c1.u === 'used' && !c1.open && c1.seen && has(c1l, /good kick/), { c1, c1l });
  const c2 = await ev(() => { const G = game, A = W8.arch; beh('aggressive'); P.face(A.door.x, A.door.z); G.step(0.1); const tg = P.target(); P.tap('KeyE', 0.1); for (let i = 0; i < 40; i++) G.step(1 / 30); P.settle(); return { tg: tg && { kind: tg.kind, label: tg.label }, open: !!G.flags.w8c_open, wall: A.wall.visible, heap: A.heap.visible }; });
  const c2l = await said();
  check('C: Aggressive (F3): the prompt is "Kick"; E kicks the bricks in: the heap at its foot, old steps behind', c2.tg?.label === 'p_kick' && c2.open && !c2.wall && c2.heap && has(c2l, /old steps/), { c2, c2l });
  await shot('wave8-06-arch-open');
  const c3 = await ev(() => { const G = game, A = W8.arch; beh('normal'); const u = P.use(A.door.x, A.door.z, { kind: 'w8c_up', near: 0.9 }); for (let i = 0; i < 40 && G.trans; i++) G.step(0.1); P.settle(); return { u: u.r, up: !!G.flags.w8c_up, y: r2(G.hero.pos.y), top: r2(A.top.y), d: r2(Math.hypot(G.hero.pos.x - A.grate.x, G.hero.pos.z - A.grate.z)) }; });
  const c3l = await said();
  check('C: the steps (E, "Climb the steps"): out under the grate on Lhar\'s terrace, which unbolts from below ("A short way up from the valley")', c3.up && Math.abs(c3.y - c3.top) < 0.5 && c3.d < 2.5 && has(c3l, /short way up/), { c3, c3l });
  await shot('wave8-07-grate-open');
  const c4 = await ev(() => { const G = game, A = W8.arch; const u = P.use(A.grate.x, A.grate.z, { kind: 'w8c_down', near: 0.8 }); for (let i = 0; i < 40 && G.trans; i++) G.step(0.1); P.settle(); return { u: u.r, y: r2(G.hero.pos.y), foot: r2(A.foot.y) }; });
  check('C: the grate (E, "Go down the steps"): back at the arch\'s foot in the valley', c4.u === 'used' && Math.abs(c4.y - c4.foot) < 0.5, c4);
  await saveQuit();
  const c5 = await ev(() => { const A = W8.arch; return { w8: w8(), wall: A?.wall.visible, room: game.room?.id }; });
  check('C: Save & quit -> Continue: the arch stays open and the grate unbolted (w8c_open, w8c_up)', c5.w8.w8c_open && c5.w8.w8c_up && c5.wall === false, c5);
}

// ================================================================ Q · Normal: the quiet talk (Citadel, Bersimon's tent)
if (ONLY.includes('Q')) {
  iso('to Citadel by the travel network\'s own move: before the Weather Wizard\'s tent');
  const q0 = await ev(() => { const S = W8.slate; goRegion('citadel', S.x + 4, S.z - 1, -Math.PI / 2); beh('normal'); return { slate: !!S }; });
  await pair('wave8-08-slate', (h) => { W8.slate.grp.visible = !h; });
  const q1 = await ev(() => { const S = W8.slate; const u = P.use(S.x, S.z, { kind: 'w8q_slate', near: 0.9 }); return { u: u.r, read: !!game.flags.w8q_slate }; });
  const q1l = await said();
  check('Q: the slate by the tent\'s door (E): WEATHER WIZARD. QUIET, PLEASE … WALK IN. TALK PLAINLY.', q1.u === 'used' && q1.read && has(q1l, /TALK PLAINLY/), { q1, q1l });
  // (his own stories first, as a player meets them: talked to until they are told)
  const q2 = await ev(() => { const G = game, out = []; const e = P.enter('wtent'); for (let k = 0; k < 5 && !G.story.w8.wizardFree(); k++) { P.talk('bersimon'); out.push(window._said.splice(0).join(' | ').slice(0, 120)); } return { e: e.r, free: G.story.w8.wizardFree(), own: out }; });
  check('Q: in the tent (INPUT, by its door): Bersimon\'s own stories (the pearl, the lightning, the trapdoor) are told first', q2.free, q2);
  // (walked up to him first — P.go walks in Normal —, then the behaviour key and E where he stands, as a player would)
  const q3 = await ev(() => { const G = game, n = P.npc('bersimon'); P.go(n.pos.x, n.pos.z, { tol: 1.3, stopWhen: () => P.target()?.id === 'bersimon' }); P.face(n.pos.x, n.pos.z); beh('athletic'); const b = G.hero.behaviour, tg = P.target(); P.tap('KeyE', 0.1); P.settle(); return { b, tg: tg?.id, k: 'talked', done: !!G.flags.w8q_done, nudge: G.flags.w8q_nudge }; });
  const q3l = await said();
  check('Q: in Athletic (F2), talked to: "You came in at a gallop … Walk, then talk. Quietly." — no saying yet', q3.k === 'talked' && !q3.done && q3.nudge >= 1 && has(q3l, /gallop/), { q3, q3l });
  const q4 = await ev(() => { beh('normal'); const k = P.talk('bersimon'); return { k: k.r, done: !!game.flags.w8q_done }; });
  const q4l = await said();
  check('Q: in Normal (F1): the quiet talk — four ways to walk; the dog on Zeelich, the steps below Lhar, the ledge by the ruins; "You just used it."', q4.done && has(q4l, /four ways to walk/) && has(q4l, /below Lhar/) && has(q4l, /ledge waits/) && has(q4l, /You just used it/), { q4, q4l });
  const q5 = await ev(() => { const k = P.talk('bersimon'); const j = jsec(/Four ways to walk/); return { k: k.r, j: j?.lines.map((l) => l.key + (l.done ? '+' : '-')) }; });
  const q5l = await said();
  check('Q: again: his own line, not the saying again; the journal\'s "Four ways to walk" lists the four (those done ticked)', !has(q5l, /four ways to walk/) && q5.j?.length === 4, { q5, q5l });
}

// ================================================================ N · the news (boards, a shuttle board, the stall)
if (ONLY.includes('N')) {
  iso('the deeds\' done flags cleared (none done), then two set in order: the quay light, then Pippa\'s cart');
  const DEED_FLAGS = ['pp_light', 'pp_bzzraDone', 'pp_bell', 'dx_jaspa_sorted', 'dx_way_open', 'dx_pack_given', 'dx_gaze_open', 'dx_heat_open', 'dx_heat_late', 'dx_store_given', 'dx_kite', 'dx_lf_first', 'dx_om_done', 'dx_ow_moved', 'dx_tyl_found', 'zo_done', 'zo_blow', 'dx_qc_open', 'w4b_won', 'w4l_given', 'w4r_found', 'w5c_open', 'w5b_done', 'w7m_done', 'w7d_up', 'fr_given'];
  const n0 = await ev((F) => { const G = game; window._kept = {}; for (const k of F) { if (k in G.flags) window._kept[k] = G.flags[k]; delete G.flags[k]; } delete G.flags.w8n_seen; goRegion('citadel', -40, -12, 0); const B = G.story.stands.things().find((t) => t.kind === 'cs_board' && t.which === 'square'); window._board = B; G.step(1.2); const u = P.use(B.x, B.z, { kind: 'cs_board', near: 1.0, match: 3 }); return { u: u.r, seen: G.flags.w8n_seen || '' }; }, DEED_FLAGS);
  const n0l = await said();
  check('N: the square\'s notice board (E) with no deed done: the town\'s notice only, no news sheet', n0.u === 'used' && n0l.length >= 1 && !has(n0l, /news sheet/), { n0, n0l });
  const n1 = await ev(() => { const G = game; G.flags.pp_light = true; G.step(1.2); G.flags.w7m_done = true; G.step(1.2); const B = window._board; const u = P.use(B.x, B.z, { kind: 'cs_board', near: 1.0, match: 3 }); return { u: u.r, seen: G.flags.w8n_seen }; });
  const n1l = await said();
  check('N: two deeds done, the quay light first, then Pippa\'s cart: the board\'s notice, then "Pinned beside it, the latest news sheet": PIPPA\'S SECOND CART ARRIVES first, then QUAY LIGHT BLINKS AGAIN', n1.seen === 'light,pippa' && has(n1l, /latest news sheet/) && n1l.findIndex((l) => /PIPPA'S SECOND CART/.test(l)) >= 0 && n1l.findIndex((l) => /PIPPA'S SECOND CART/.test(l)) < n1l.findIndex((l) => /QUAY LIGHT/.test(l)), { n1, n1l });
  // (the picture: the board read again, its notice passed with E, the news sheet's box up)
  if (SHOTS) {
    await ev(() => { const B = window._board; P.go(B.x, B.z, { tol: 1.0, stopWhen: () => P.target()?.kind === 'cs_board' }); P.face(B.x, B.z); P.tap('KeyE', 0.1); const txt = () => document.querySelector('#dialog .text')?.textContent || ''; for (let i = 0; i < 8 && !/PIPPA|QUAY LIGHT/.test(txt()); i++) { game.step(0.8); P.tap('KeyE', 0.1); } game.step(2.0); });
    await shot('wave8-09-board-news'); await ev(() => P.settle()); await said();
  }
  iso('to Otringal by the travel network\'s own move');
  const n2 = await ev(() => { const G = game; goRegion('isle_otringal'); const R = G.room, st = G.story.w8.stallItem(R), bd = (R.items || []).find((i) => i.kind === 'shuttleBoard'); window._stall = st; const u1 = bd ? P.use(bd.x, bd.z, { kind: "il_item", near: 1.6, match: 3 }) : { r: 'no board' }; const l1 = window._said.splice(0); const u2 = P.use(st.x, st.z, { kind: "il_item", near: 1.6, match: 3 }); const l2 = window._said.splice(0); return { u1: u1.r, l1, u2: u2.r, l2, papers: !!W8.papers }; });
  check('N: Otringal\'s shuttle departures board (E): its own lines, then the latest news sheet', n2.u1 === 'used' && has(n2.l1, /DEPARTURES/) && has(n2.l1, /latest news sheet/), n2);
  check('N: Otringal\'s unattended market stall (E): its own slate, then the stack of news sheets, THE CLOUD CRIER, a headline', n2.u2 === 'used' && n2.papers && has(n2.l2, /CLOUD CRIER/) && has(n2.l2, /PIPPA'S SECOND CART|QUAY LIGHT/), n2);
  if (SHOTS) { await ev(() => { const S = window._stall; const ry = S.ry; P.go(S.x + Math.sin(ry) * 2.6, S.z + Math.cos(ry) * 2.6, { tol: 0.4 }); P.face(S.x, S.z); game.step(0.3); }); await pair('wave8-10-stall', (h) => { W8.papers.grp.visible = !h; }); }
  await ev(() => { Object.assign(game.flags, window._kept); game.story.applyFlags(); game.step(1.2); });
}

// ================================================================ E · the ending: the thanks round and the open favours
if (ONLY.includes('E')) {
  // (the picture of the journal's "Open favours" is taken in chapter 14, before the ending is set: the section list then
  //  names no chapter after 14 — nothing of chapters 15–16 in the pictures)
  iso('Lumi\'s shade asked about, not mended (w7d_need: a story started); Pippa\'s cart started, not delivered (w7m_hook)');
  const ej = await ev(() => { const f = game.flags; Object.assign(f, { w7d_need: true, w7m_hook: true }); delete f.w7d_up; delete f.w7m_done; game.story.applyFlags(); game.step(0.2); const j = jsec(/Open favours/); return j?.lines.map((l) => l.key); });
  check('E: in chapter 14 the journal\'s "Open favours" lists the stories started and not finished (Lumi\'s shade, Pippa\'s cart), and no thank-you line before the ending', !!ej && ej.includes('w8o_sail') && ej.includes('w8o_pippa') && !ej.includes('w8j_thanks_n'), ej);
  if (SHOTS) {
    await ev(() => { game.inventory.show(true, { tab: 'journal' }); game.setState('inventory'); const inv = game.inventory, secs = inv.sections(); inv.jsec = secs.findIndex((s) => /Open favours/.test(s.title)); inv.render(); });
    await page.screenshot({ path: path.join(SHOTS, 'wave8-11-journal-open-favours.png'), timeout: 300000 });
    await ev(() => { game.inventory.show(false); game.setState('play'); game.step(0.1); });
  }
  iso('the ending\'s free play: the chapter key \'home\', the dinner and the end card done; Pippa\'s cart delivered (w7m_done); Lumi\'s shade asked about, not mended (w7d_need: started)');
  const e0 = await ev(() => { const G = game, f = G.flags; goRegion('citadel', -44, 1.5, 0); Object.assign(f, { chapterKey: 'home', chapter: G.story.chapters.findIndex((c) => c.key === 'home'), ep_dinner: true, ep_free: true, w7m_done: true, w7m_hook: true, w7d_need: true }); delete f.w7d_up; delete f.w8t_pippa; G.story.applyFlags(); G.story.refreshCast(); for (let i = 0; i < 10; i++) G.step(0.05); P.settle(); const j = jsec(/Open favours/); return { ck: G.story.cur.key, lines: j?.lines.map((l) => l.key), due: G.story.w8.thanksDue() }; });
  const e0txt = await ev(async () => { const { t } = await import('/src/game/i18n.js'); const j = jsec(/Open favours/); return j?.lines.map((l) => t(l.key)); });
  check('E: the journal\'s "Open favours" in the ending: Lumi\'s torn shade (started, not done) listed, Pippa\'s cart (done) not; "People who would like a word: … Pippa …"', e0.ck === 'home' && e0.lines?.includes('w8o_sail') && !e0.lines?.includes('w8o_pippa') && e0.due.includes('pippa') && has(e0txt || [], /would like a word: .*Pippa/), { e0, e0txt });
  const e1 =await ev(() => { const G = game, h = G.hero; h.hp = Math.max(1, h.maxHp - 3); const hp0 = h.hp; const k = P.talk('pippa'); return { k: k.r, thanked: !!G.flags.w8t_pippa, hp0, hp: h.hp, max: h.maxHp }; });
  const e1l = await said();
  check('E: Pippa (TALK) in the ending: her thank-you ("The town\'s still talking about my cart … have an apple"), life back', e1.k === 'talked' && e1.thanked && e1.hp === e1.max && has(e1l, /talking about my cart/), { e1, e1l });
  const e2 = await ev(() => { const G = game, h = G.hero; h.hp = h.maxHp - 2; const k = P.talk('pippa'); const due = G.story.w8.thanksDue(); return { k: k.r, hp: h.hp, max: h.maxHp, due }; });
  const e2l = await said();
  check('E: Pippa again: no second thank-you, no second gift; the journal no longer names her', e2.hp < e2.max && !has(e2l, /talking about my cart/) && !e2.due.includes('pippa'), { e2, e2l });
}

// ================================================================ O · the pieces scanned
if (ONLY.includes('O')) {
  await page.addScriptTag({ path: SWEEP }); await ev(() => SW.init());
  const o1 = await ev(async () => {
    const out = {}, f = game.flags;
    const keep = (r) => { const all = [...(r.interp || []), ...(r.zf || []), ...(r.floats || []), ...(r.sunk || []), ...(r.buried || []), ...(r.decals || []), ...(r.rockCut || [])]; return all.filter((x) => /wave8/.test(JSON.stringify(x))).map((x) => JSON.stringify(x).slice(0, 300)); };
    const box = (x, z, r) => ({ bounds: { x0: x - r, x1: x + r, z0: z - r, z1: z + r } });
    for (const k of ['w8c_open', 'w8c_up', 'w8a_done']) delete f[k];
    game.story.applyFlags();
    goRegion('zeelich');
    out.hatch = keep(await SW.scan(box(W8.hatch.x, W8.hatch.z, 2.0), { step: 0.12 })); SW.free();
    goRegion('desert');
    out.ledge = keep(await SW.scan(box(W8.ledge.x + 1.8, W8.ledge.z, 3.2), { step: 0.15 })); SW.free();
    goRegion('hamalayi');
    out.archShut = keep(await SW.scan(box(W8.arch.foot.x, W8.arch.foot.z + 2.2, 4.4), { step: 0.12 })); SW.free();   // (#64: and its bank steps)
    out.grateShut = keep(await SW.scan(box(W8.arch.top.x, W8.arch.top.z, 1.2), { step: 0.1 })); SW.free();
    f.w8c_open = true; f.w8c_up = true; game.story.applyFlags(); game.step(0.1);
    out.archOpen = keep(await SW.scan(box(W8.arch.foot.x, W8.arch.foot.z, 2.2), { step: 0.12 })); SW.free();
    out.grateOpen = keep(await SW.scan(box(W8.arch.top.x, W8.arch.top.z, 1.2), { step: 0.1 })); SW.free();
    goRegion('isle_otringal');
    out.papers = keep(await SW.scan(box(W8.papers.x, W8.papers.z, 2.2), { step: 0.08 })); SW.free();
    goRegion('citadel', W8.slate.x + 3, W8.slate.z, 0);
    out.slate = keep(await SW.scan(box(W8.slate.x, W8.slate.z, 1.2), { step: 0.1 })); SW.free();
    return out;
  });
  check('O: every wave-8 piece in each state it shows — the hatch and its dog, the ledge and the flat rock, the arch shut and open, the grate shut and open, the news sheets on the stall, the tent\'s slate — scanned (overlap sweep library): no finding names a wave-8 piece', Object.values(o1).every((a) => a.length === 0), o1);
}
await browser.close();
done();
