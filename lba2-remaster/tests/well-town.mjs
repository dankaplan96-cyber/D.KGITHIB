// Chapter 1 (The Well), the town part made longer (CH1-LONGER, src/game/story/prologue.js): the steps, their order,
// what each says when it fails, the journal's honesty, the nudges, and Save → Continue at every new step.
//   1. Mira refuses the key for a "pipe fault" (Zoé's marker, the objective, the journal says so — never "Mira gave me
//      the key" before she has); Zoé's kettle crystals (she hears of the refusal); Mira gives the key
//   2. the lid: before the key, Aggressive gives no kick (only the padlock line); with the key, rusted to the rim;
//      Save → Continue keeps it rusted; the ball bounces off (a line, once); the nudge after a while near it names
//      Aggressive and the key; the Aggressive prompt is a kick; Save → Continue keeps it open
//   3. the harbour: Doran sleeps through talk; the ball rings the bell (before Xil: awake and grumbling, no stamp);
//      Save → Continue: still awake; Xil (no bell line once it has rung); Doran stamps
//   4. the bay rocks: too high to walk up (the jump's hint); the warm stones; Save → Continue: taken, kashes kept
//   5. an old save (from before CH1-LONGER: key, Xil's stamp and rope, no new flags) continues: the lid is still to open
//      (no step skipped that it hadn't passed), Doran awake, no new step behind it
// By INPUT (the player harness) where a player acts; ISO only to set up an old save and to stand on the top rock.
import { launch, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const URL0 = (process.env.GAME_URL || 'http://localhost:8123/') + '?nocine';
const SHOTS = process.env.SHOTS;
const view = async (n) => { if (SHOTS) { await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${n}.jpg`, type: 'jpeg', quality: 80, timeout: 180000 }); } };
const boot = async (mode) => {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 480000 });
  await ev(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => { game.testFreeze = true; game.step(0.2); P.settle(); });
};
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const obj = () => ev(() => document.querySelector('#pause-objective')?.textContent || '');
const journal = () => ev(() => game.story.journal()[0].lines.map((l) => l.key + (l.done ? '+' : '')));
const items = () => ev(() => game.story.items().map((i) => i.id));
const saveAndContinue = async () => { await ev(() => { P.settle(); game.save(false); }); await boot('continue'); await said(); };
const lidState = () => ev(() => { const L = game.story.chapters[0].lid; return { lock: L.lock.visible, rot: +L.pivot.rotation.x.toFixed(2), stuck: !!game.flags.pr_lidStuck, open: !!game.flags.pr_lidOpen }; });

await boot('new');
await said();
await ev(() => { const s = game.room.searches[0]; P.use(s.x, s.z); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); });

// ---------------------------------------------------------------- 1. Mira's key
let r = await ev(() => { const w = game.world.well; return P.use(w.x, w.z, { near: 2.0, run: true, kind: 'well' }); });
let s = await said();
check('the well looked at: padlocked (INPUT)', has(s, /padlocked/), { r, s });
r = await ev(() => { P.tap('F3'); const w = game.world.well; P.go(w.x - 2.0, w.z, { tol: 0.4 }); P.face(w.x, w.z); return { label: game.findInteractable()?.label }; });
check('before the key, Aggressive gives the well no kick prompt', r.label === 'p_well', r);
await ev(() => P.tap('F1'));
r = await ev(() => P.talk('gilbert', { run: true })); s = await said();
const j1 = await journal(), o1 = await obj();
check('Mira refuses: "I don\'t unlock the town well for a pipe fault" (INPUT)', r.r === 'talked' && has(s, /pipe fault/) && !(await ev(() => game.flags.key)), { r, s });
check('the objective asks for proof, the journal says what Mira said (no "gave me the key" yet)', o1.includes('Mira wants proof') && j1.includes('pr_j_mira') && !j1.some((k) => k.startsWith('pr_j_key')), { o1, j1 });
check('the map marks Zoé (she has the proof)', await ev(() => game.story.markers().some((m) => m.label === 'Zoé')));
r = await ev(() => P.talk('zoe', { run: true })); s = await said();
check('Zoé hears of the refusal and gives the kettle crystals (INPUT)', has(s, /Mira won't open the well/) && has(s, /kettle/) && (await items()).includes('kettle'), { r, s });
r = await ev(() => P.talk('mira', { run: true })); s = await said();
check('Mira, shown the crystals: "pipes don\'t grow those", the key (INPUT)', has(s, /pipes don't grow those/) && (await ev(() => game.flags.key)) && !(await items()).includes('kettle') && (await items()).includes('lidkey'), { s, items: await items() });

// ---------------------------------------------------------------- 2. the lid
r = await ev(() => { const w = game.world.well; return P.use(w.x, w.z, { near: 2.0, kind: 'well' }); }); s = await said();
let L = await lidState();
check('the lid: the padlock off, rusted to the rim; Gilbert says kick it (INPUT)', has(s, /rusted to the rim/) && has(s, /good kick/) && !L.lock && L.rot === 0 && L.stuck && !L.open, { s, L });
check('the objective: open the rusted lid', (await obj()).includes('Open the rusted lid'), await obj());
{ const j = await journal(); check('the journal lists the rusted lid while it is a need', j.includes('pr_j_lid'), j); }
await view('w1-lid-stuck');
await saveAndContinue();
L = await lidState();
check('Save → Continue: the lid still rusted (padlock off, down)', !L.lock && L.rot === 0 && L.stuck && !L.open, L);
// the ball: it bounces off, one line
r = await ev(() => { const w = game.world.well, h = game.hero; P.go(w.x - 3.2, w.z, { tol: 0.4 }); P.face(w.x, w.z); game.ball.state = 'idle'; h.mp = Math.max(h.mp, 2);
  P.tap('KeyF', 0.05); for (let i = 0; i < 60 && game.state === 'play'; i++) game.step(1 / 30); P.settle(); return { open: !!game.flags.pr_lidOpen }; });
s = await said();
check('the ball at the rusted lid: it bounces off, "it needs weight behind it" (INPUT)', !r.open && has(s, /weight behind it/), { r, s });
// the nudge: about half a minute near the lid without opening it
r = await ev(() => { for (let t = 0; t < 34; t += 0.5) game.step(0.5); return (game.hud.toastLog || []).slice(-3); });
check('the nudge after ~30 s at the lid names Aggressive and the key', r.some((x) => /^Aggressive \(.+\), then .+ by the lid$/.test(x)), r);
r = await ev(() => { P.tap('F3'); const w = game.world.well; P.go(w.x - 2.0, w.z, { tol: 0.4 }); P.face(w.x, w.z); const label = game.findInteractable()?.label; P.tap('KeyE', 0.1); game.step(1.0); P.settle(); P.tap('F1'); return { label }; });
s = await said(); L = await lidState();
check('Aggressive: the prompt is a kick, the kick opens the lid (INPUT)', r.label === 'p_kick' && L.open && L.rot > 1.5 && has(s, /one kick/), { r, s, L });
await view('w2-lid-open');
await saveAndContinue();
L = await lidState();
check('Save → Continue: the lid open', L.open && L.rot > 1.5, L);
{ const j = await journal(); check('the journal drops the rusted-lid line once the lid is open', !j.some((k) => k.startsWith('pr_j_lid')), j); }

// ---------------------------------------------------------------- 3. the harbour: Doran, the bell, Xil
r = await ev(() => P.talk('doran', { run: true })); s = await said();
check('Doran asleep: talk does not wake him (INPUT)', has(s, /Zzzz/) && !(await ev(() => game.flags.pr_bell)), s);
r = await ev(() => { const B = game.story.chapters[0].bell; return P.use(B.x, B.z - 0.8, { near: 1.6, kind: 'bell' }); }); s = await said();
check('the bell: its rope long gone, out of reach (INPUT)', has(s, /out of reach/), s);
await view('w3-bell');
r = await ev(() => { const B = game.story.chapters[0].bell; for (let k = 0; k < 5 && !game.flags.pr_bell; k++) { const a = -Math.PI / 2 + (k - 2) * 0.35; P.go(B.x - Math.sin(a) * 5, B.z - Math.cos(a) * 5, { tol: 0.6 }); P.throwAt(B.x, B.z); } P.wait(1.2); P.settle(); return { bell: !!game.flags.pr_bell, stamp: !!game.flags.stamp, anim: P.npc('doran').forceAnim }; });
s = await said();
check('the ball rings the bell before Xil: Doran up and grumbling, no stamp yet (INPUT)', r.bell && !r.stamp && r.anim == null && has(s, /There is no boat/) && has(s, /someone younger/), { r, s });
await saveAndContinue();
r = await ev(() => ({ bell: !!game.flags.pr_bell, anim: P.npc('doran').forceAnim, targets: game.story.ballTargets().length }));
check('Save → Continue: Doran stays awake, the bell is no longer a target', r.bell && r.anim == null && r.targets === 0, r);
r = await ev(() => P.talk('doran', { run: true })); s = await said();
check('Doran awake, no errand yet: "No boat, no business" (INPUT)', has(s, /No boat, no business/), s);
r = await ev(() => P.talk('xil', { run: true })); s = await said();
check('Xil: the permit (no bell line once it has rung) (INPUT)', (await ev(() => game.flags.metXil)) && !has(s, /bell/), s);
r = await ev(() => P.talk('doran', { run: true })); s = await said();
check('Doran stamps (INPUT)', (await ev(() => game.flags.stamp)) && has(s, /Stamp/), s);
{ const j = await journal(); check('the journal drops the stamp line once Doran has stamped', !j.some((k) => k.startsWith('pr_j_doran')), j); }
r = await ev(() => P.talk('xil', { run: true }));
check('Xil: the rope ladder (INPUT)', await ev(() => !!game.flags.rope));

// ---------------------------------------------------------------- 4. the bay rocks
// (its rise over the ground just round its rim, every side: more than a step (0.55 m), less than a jump (1.19 m) on the
// highest side; and a walk straight at it from the sand ends at its foot)
r = await ev(() => { const b = game.story.chapters[0].bay[0], h = game.hero, PH = game.physics; let hi = -9;
  const R = game.story.chapters[0].bay;   // (not where the next rock stands)
  for (let a = 0; a < 24; a++) { const x = b.x + Math.sin(a * Math.PI / 12) * (b.r + 0.45), z = b.z + Math.cos(a * Math.PI / 12) * (b.r + 0.45); if (R.some((o) => o !== b && Math.hypot(x - o.x, z - o.z) < o.r + 0.3)) continue; hi = Math.max(hi, PH.groundAt(x, z, 3)); }
  P.go(b.x + 2.4, b.z - 1.0, { run: true, tol: 0.5 }); P.face(b.x, b.z); P.holdFor(['ArrowUp'], 1.5); const walkedUp = h.pos.y > b.top - 0.3;
  return { rimHigh: +hi.toFixed(2), top: +b.top.toFixed(2), rise: +(b.top - hi).toFixed(2), walkedUp }; });
check('the first bay rock is too high to walk up, low enough to jump (INPUT for the walk)', !r.walkedUp && r.rise > 0.6 && r.rise < 1.15, r);
r = await ev(() => { const b = game.story.chapters[0].bay[0]; return P.use(b.x + 1.8, b.z - 1.0, { near: 0.6, kind: 'rocks' }); }); s = await said();
const tl = await ev(() => (game.hud.toastLog || []).slice(-2));
check('looked at: "too high to climb, not too high to jump", the jump\'s keys (INPUT)', has(s, /Not too high to jump/) && tl.some((x) => /^Athletic/.test(x)), { s, tl });
await view('w4-rocks');
await ev(() => { const S = game.story.chapters[0].stones, h = game.hero; h.pos.set(S.x + 0.6, S.top, S.z - 0.4); h.onGround = true; h.vy = 0; h.angle = Math.atan2(-0.6, 0.4); game.step(0.3); });
const c0 = await ev(() => game.hero.coins);
r = await ev(() => { const S = game.story.chapters[0].stones; return P.use(S.x, S.z, { near: 0.4, kind: 'stones' }); }); s = await said();
check('the warm stones: "hum like a bee in a jar", +10 kashes, the Warm Stone (INPUT)', has(s, /bee in a jar/) && (await ev(() => game.hero.coins)) === c0 + 10 && (await items()).includes('warmstone'), { s, items: await items() });
await view('w5-stones');
await saveAndContinue();
r = await ev(() => ({ taken: !game.story.chapters[0].stones.take.visible, flag: !!game.flags.pr_stones, coins: game.hero.coins, j: game.story.journal()[0].lines.map((l) => l.key) }));
check('Save → Continue: the stone taken, the kashes kept, the journal has the stones', r.taken && r.flag && r.coins === c0 + 10 && r.j.includes('pr_j_stones'), r);
const jAll = await journal();
check('the journal lists only what is true (no open line in the past tense)', !jAll.some((k) => /^pr_j_(key|rope|stones|cave|sendell)$/.test(k)), jAll);

// ---------------------------------------------------------------- 5. an old save (before CH1-LONGER)
await ev(() => {
  const keep = { ...game.flags };
  for (const k of Object.keys(game.flags)) if (/^pr_/.test(k)) delete game.flags[k];
  Object.assign(game.flags, { key: true, metXil: true, stamp: true, rope: true, wellSeen: true, timConfessed: keep.timConfessed });
  game.hero.hasKey = true; game.save(false);
});
await boot('continue'); await said();
r = await ev(() => { const L = game.story.chapters[0].lid; return { lock: L.lock.visible, obj: document.querySelector('#pause-objective')?.textContent, doran: P.npc('doran').forceAnim, targets: game.story.ballTargets().length }; });
check('an old save (key, stamp, rope; no new flags) continues: Doran awake, the bell no target, the lid still to open', r.doran == null && r.targets === 0 && /Open the rusted lid/.test(r.obj), r);
r = await ev(() => { const w = game.world.well; P.use(w.x, w.z, { near: 2.0, run: true, kind: 'well' }); P.tap('F3'); P.go(w.x - 2.0, w.z, { tol: 0.4 }); P.face(w.x, w.z); P.tap('KeyE', 0.1); game.step(1.0); P.settle(); P.tap('F1'); P.use(w.x, w.z, { near: 2.0, kind: 'well' }); return { room: game.room?.id, open: !!game.flags.pr_lidOpen }; });
check('the old save goes on: the lid kicked open, down the well (INPUT)', r.open && r.room === 'well', r);

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
