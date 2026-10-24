// Chapter 4 playthrough (Desert Island): jump to the end of chapter 3 → the sealed shaft → Kesh (Mother Tarra, the
// wind-pump) → Hesk, the rope, the sand-yacht → Ilka's camp → the research post in a sandstorm (the notebook) →
// save/reload → the dig (the keypad, terraces, five discs) → the carving and Dallan → chapter 5.
// ADV-2 (the pump found by listening and watching; the keypad entered by the player), by INPUT with the player
// harness (tests/lib/player.js: walking, E, the ball, the menu): Tarra points to Brosk and Sani (no solution);
// Brosk blames the bore's tremors; Sani hears two gears clack and one grind; Listen at the tower brings a gust; in it
// the sound gears rock, the jammed one holds and shudders, the sand/grind cue fires; a wrong guess (a sound gear:
// it rings, a line, nothing changes) and Sani's stronger hint; the jammed gear frees and the water sprays at the
// shaken joint; Brosk's "the shaking knocked that pipe loose"; Save & quit → Continue in that state; the joint
// pushed home; the oasis fills; Tarra's trust. At the dig gate the keypad's menu: a wrong order buzzes (line, gate
// shut), the notebook's order opens it. At the end, old saves (format 3, from REV-TY-4): the chapter's start (the
// pump fixed before Tarra asks: her "before anyone asked you?"), an older mid-pump state (old gears 0 and 2 freed),
// the notebook taken but the gate shut (the keypad, no auto-entry), the worn keys without the notebook (no menu).
// ADV-1 (the dig's five discs, docs/lba3-team/ADVENTURE_DESIGN.md): from the open gate on, by INPUT: Ilka at the rim,
// the warm crack on the way down, the five discs, the carving over the door, a warm disc, a cold disc shutting it
// again, Ilka's stronger hint, Save & quit → Continue with two discs open, a cold disc again (a toast this time), a
// death → Retry, the three warm discs, the temple's line about the cold discs, the journal.
// Hesk → the notebook still use the older teleport helpers (T: ISO), as before. PASS/FAIL lines and the exit code.
// (Played by an agent who knows the solution: not a first-time player's test.) SHOTS=<dir> keeps the ADV-2 views.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const REV4 = fileURLToPath(new URL('../docs/lba3-production/reviews/REV-TY-4/', import.meta.url));
const SHOTS = process.env.SHOTS;
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : JSON.stringify(info)?.slice(0, 700)); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
const shot = async (n) => { await ev(() => game.renderer.render()); await page.screenshot({ path: n, timeout: 180000 }); };
const view = async (n) => { if (SHOTS) { await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${n}.jpg`, type: 'jpeg', quality: 72, timeout: 180000 }); } };
const URL0 = (process.env.GAME_URL || 'http://localhost:8123/') + '?nocine';
const boot = async (mode) => {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 480000 });   // (a shared machine under load needs the margin)
  await page.evaluate(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await ev(() => {
    const G = window.game; G.testFreeze = true;
    window.T = {
      tap(c) { G.input.taps.add(c); G.step(1 / 60); },
      talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0, y = null) { const h = G.hero; h.pos.set(x, y == null ? G.physics.groundAt(x, z) : G.physics.groundAt(x, z, y + 1), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); },
      npc(id) { return G.npcs.find((n) => n.def.id === id); },
      talk(id) { const n = T.npc(id); const h = G.hero; h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.8); T.tap('KeyE'); G.step(0.05); T.talkAll(); },
      useAt(x, z, y = null) { T.tp(x + 0.9, z + 0.3, 0, y); G.hero.angle = Math.atan2(x - G.hero.pos.x, z - G.hero.pos.z); G.step(0.3); T.tap('KeyE'); G.step(1.6); T.talkAll(); },
      // walk onto an exit and let the room change happen
      exit(to) { const e = G.room.exits.find((x) => x.to === to); if (!e) return 'no exit ' + to; T.tp(e.x, e.z, 0, e.y ?? Math.max(G.hero.pos.y, G.room.deckY ?? -1e9) + 0.5); G.step(1.6); T.talkAll(); return G.room?.id ?? 'out'; },
      f() { return { ...G.flags }; },
      obj() { return document.querySelector('#objective')?.textContent || ''; },
    };
  });
  await page.addScriptTag({ path: HARNESS });
};
// what was said (every line through game.say since the last call)
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const obj = () => ev(() => document.querySelector('#objective')?.textContent || '');
const journal = () => ev(() => game.story.journal().flatMap((c) => c.lines.map((l) => l.key)));
const pumpState = () => ev(() => { const pu = game.rooms.desert.pump, f = game.flags; return { state: pu.state, spray: pu.joint.spraying, loose: pu.joint.loose, gear1: !!f.c4_gear1, miss: f.c4_gearMiss || 0, pump: !!f.c4_pump, joint: !!f.c4_joint, target: !!game.rooms.desert.ballTargets.find((t) => t.gear != null)?.done }; });
// throw at one of the pump's gears as a player does: stand west of the tower in front of it, turn until the aim
// marker sits on that gear (a tap of Left/Right at a time), tap F (another spot if a throw misses)
// (`kind` 'gear' = the jammed one's target, 'gearOk' = a sound one's)
const throwGear = (kind, i) => ev(([kind, i]) => {
  const G = game, g = G.rooms.desert.pump.gears[i], h = G.hero, want = G.room.ballTargets.find((t) => t[kind] === i);
  const key = () => JSON.stringify([G.flags.c4_gear1, G.flags.c4_gearMiss || 0]);
  const aimed = () => G.targeting?.throwTarget?.({ x: Math.sin(h.angle), z: Math.cos(h.angle) });
  for (let k = 0; k < 5; k++) {
    const r = [4.2, 5.0, 3.6, 5.6, 4.6][k];
    P.go(g.x + g.nx * r, g.z + g.nz * r, { tol: 0.35, maxT: 40 }); P.settle();
    for (let w = 0; w < 120 && G.ball.state !== 'idle'; w++) G.step(1 / 30);
    if (h.behaviour !== 'normal') P.tap('F1');
    P.face(g.x, g.z);
    for (let n = 0; n < 24 && aimed() !== want; n++) {   // (the marker on a neighbour: nudge toward the wanted one)
      const a = aimed(), da = a ? Math.atan2(a.x - h.pos.x, a.z - h.pos.z) - Math.atan2(g.x - h.pos.x, g.z - h.pos.z) : 0;
      P.tap(Math.sin(da) > 0 ? 'ArrowRight' : 'ArrowLeft', 0);
    }
    const onMark = aimed() === want, f0 = key(); P.tap('KeyF', 0.05); G.step(1.6); P.settle();
    if (key() !== f0) return { k, r: 'hit', kind, onMark };
  }
  return { r: 'missed', kind };
}, [kind, i]);

await boot('new');
// to the end of chapter 3 (Zeelich): the sealed shaft sends Twinsen south
await ev(() => { const G = game; T.talkAll(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); });
log('sealed shaft', await ev(() => { const G = game; Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true });
  G.story.cur.toShell(); T.talkAll(); G.step(1.5); T.talkAll(); return [G.flags.chapterKey, G.room?.id, G.state, T.obj()]; }));
await shot('C4-00-arrive.png');
await said();

// ---- ADV-2: Kesh's wind-pump, by input
const ta = await ev(() => P.talk('tarra', { run: true })); let s = await said();
check('Tarra asks for the pump and points to Brosk and Sani, not to the answer (INPUT)', ta.r === 'talked' && (await ev(() => !!game.flags.c4_pumpTask)) && has(s, /Sani says the pump talks/) && !has(s, /ball|three gears|knock/i), { ta, s });
check('the objective: restart the wind-pump (no count to tick off)', (await obj()) === 'Restart the wind-pump', await obj());
const br = await ev(() => P.talk('dtrader', { run: true })); s = await said();
check('Brosk blames the test bore\'s tremors (INPUT)', br.r === 'talked' && has(s, /test bore started shaking/) && has(s, /It's the ground/), { br, s });
const sa = await ev(() => P.talk('dkid', { run: true })); s = await said();
check('Sani hears it from the roof: two gears clack, one grinds — not which (INPUT)', sa.r === 'talked' && has(s, /Two gears clack\. One grinds/) && !has(s, /middle|top|bottom|spits sand/i), { sa, s });
check('after Sani the objective adds the method: find the gear that grinds', (await obj()).includes('Find the gear that grinds'), await obj());
const li = await ev(() => { const pu = game.rooms.desert.pump; return P.use(pu.x - 2.7, pu.z + 0.3, { kind: 'c4listen', run: true }); }); s = await said();
check('Listen at the tower (INPUT): Twinsen hears it as Sani said, and asks which', li.r === 'used' && li.target?.kind === 'c4listen' && has(s, /Just as Sani said/), { li, s });
// the gust that follows: watch the gears for 4 s
const gw = await ev(() => {
  const G = game, pu = G.rooms.desert.pump, calls = [];
  const ap = G.audio.play; G.audio.play = function (n) { calls.push(n); return ap.call(this, n); };
  const og = pu.onGust; let fired = 0; pu.onGust = () => { fired++; og(); };
  const rot = [0, 0, 0], dev = [0, 0, 0], base = pu.gears.map((g) => g.mesh.position.clone());
  for (let k = 0; k < 120; k++) { G.step(1 / 30); pu.gears.forEach((g, i) => { rot[i] = Math.max(rot[i], Math.abs(g.mesh.rotation.z)); dev[i] = Math.max(dev[i], g.mesh.position.distanceTo(base[i])); }); }
  G.audio.play = ap; pu.onGust = og;
  return { fired, rot: rot.map((v) => +v.toFixed(3)), dev: dev.map((v) => +v.toFixed(3)), calls, jam: pu.jam };
});
check('a gust: the sound gears rock, the jammed one holds and shudders; the clack and grind cues fire (called, not heard)', gw.fired >= 1 && gw.jam === 1 && gw.rot[0] > 0.15 && gw.rot[2] > 0.15 && gw.rot[1] < 0.05 && gw.dev[1] > 0.01 && gw.dev[0] < 1e-6 && gw.calls.includes('grind') && gw.calls.includes('gearClack'), gw);
await ev(() => { const pu = game.rooms.desert.pump; P.go(pu.x - 5, pu.z, { tol: 0.5 }); P.face(pu.x, pu.z); pu.gustNow(); game.step(0.45); });
await view('adv2-01-gust');
// a wrong guess: the bottom gear (a sound one)
const w1 = await throwGear('gearOk', 0); s = await said(); let ps = await pumpState();
check('a wrong guess (a sound gear, INPUT): it rings and swings back, "Not that one", nothing else changes', w1.r === 'hit' && ps.miss === 1 && !ps.gear1 && ps.state === 'jammed' && has(s, /Not that one/), { w1, ps, s });
const j1 = await journal();
check('the journal recalls Brosk, Sani and the sound gear (facts, not the answer)', ['c4_j_brosk', 'c4_j_sani', 'c4_j_gearok'].every((k) => j1.includes(k)), j1);
const sa2 = await ev(() => P.talk('dkid', { run: true })); s = await said();
check('Sani\'s hint grows after the mistake: the grinding one doesn\'t turn, it spits sand (INPUT)', sa2.r === 'talked' && has(s, /It spits sand/), { sa2, s });
const w2 = await throwGear('gear', 1); s = await said(); ps = await pumpState();
check('the jammed gear knocked loose (INPUT): the train turns, the water sprays at the joint', w2.r === 'hit' && ps.gear1 && ps.state === 'leak' && ps.spray && ps.loose && ps.target && has(s, /Sand bursts out/) && has(s, /sprays out of a pipe joint/), { w2, ps, s });
check('the objective: stop the leak in the pipe', (await obj()).includes('Stop the leak in the pipe'), await obj());
await ev(() => { const J = game.rooms.desert.pump.joint; P.go(J.x - 2.4, J.z + 2.2, { tol: 0.5 }); P.face(J.x, J.z); game.step(0.5); });
await view('adv2-02-leak');
const br2 = await ev(() => P.talk('dtrader', { run: true })); s = await said();
check('Brosk, half right: the shaking knocked that pipe loose (INPUT)', br2.r === 'talked' && has(s, /knocked that pipe loose/), { br2, s });
// Save & quit → Continue in the leak state
await ev(() => { game.save(false); });
await boot('continue'); await said();
ps = await pumpState();
check('Save → Continue mid-pump: still turning, still spraying, the gear stays freed (no gust, no listen prompt)', ps.gear1 && ps.state === 'leak' && ps.spray && ps.loose && ps.target && !ps.pump, ps);
const jo = await ev(() => { const J = game.rooms.desert.pump.joint; return P.use(J.x, J.z, { kind: 'c4joint', run: true }); }); s = await said(); ps = await pumpState();
check('the joint pushed home (INPUT): the spray stops, the pump runs', jo.r === 'used' && jo.target?.kind === 'c4joint' && ps.pump && ps.joint && ps.state === 'running' && !ps.spray && !ps.loose && has(s, /collar slides home/), { jo, ps, s });
const lv = await ev(() => { const o = game.rooms.desert.oasis, l0 = o.level; game.step(4); P.settle(); return [+l0.toFixed(2), +o.level.toFixed(2)]; });
check('the oasis fills', lv[1] > lv[0], lv);
await view('adv2-03-oasis');
const ta2 = await ev(() => P.talk('tarra', { run: true })); s = await said();
check('Tarra trusts him and names Ilka (INPUT)', ta2.r === 'talked' && (await ev(() => !!game.flags.c4_trust)) && has(s, /The one you want is Ilka/), { ta2, s });
const br3 = await ev(() => P.talk('dtrader', { run: true })); s = await said();
check('Brosk takes the credit, once', br3.r === 'talked' && has(s, /I said it was the shaking/), { br3, s });
await shot('C4-01-oasis.png');
// Hesk, the rope, the ride
log('hesk', await ev(() => { T.talk('hesk'); return [game.flags.c4_heskAsk, T.obj()]; }));
log('rope', await ev(() => { const R = game.rooms.desert.rope; T.useAt(R.x, R.z); return [game.flags.c4_rope]; }));
log('ride', await ev(() => { T.talk('hesk'); const G = game; for (let i = 0; i < 400 && G.state !== 'play'; i++) G.step(0.05); return [G.flags.c4_yacht, G.state, Math.round(G.hero.pos.x), Math.round(G.hero.pos.z)]; }));
await shot('C4-02-camp.png');
log('ilka', await ev(() => { T.talk('ilka'); return [game.flags.c4_ilka, T.obj()]; }));
// the research post in a storm
log('storm', await ev(() => { const G = game; for (let i = 0; i < 400 && !G.story.cur.stormy; i++) G.step(0.05); return [G.story.cur.stormy, G.rooms.desert.post.gate.isOpen, G.rooms.desert.storm.level.toFixed(2)]; }));
log('desk', await ev(() => { const P = game.rooms.desert.post; T.tp(P.gate.x + 3, P.gate.z); T.useAt(P.desk.x, P.desk.z); return [game.flags.c4_notebook, T.obj()]; }));
await shot('C4-03-post.png');
// save/reload mid-chapter
const KEYS = ['c4_pump', 'c4_trust', 'c4_rope', 'c4_ilka', 'c4_notebook', 'c4_yacht', 'c4_gear1', 'c4_joint', 'c4_gearMiss'];
const before = await ev((K) => { game.save(false); return JSON.stringify(K.map((k) => game.flags[k] ?? null)); }, KEYS);
await boot('continue');
const after = await ev((K) => { T.talkAll(); return JSON.stringify(K.map((k) => game.flags[k] ?? null)); }, KEYS);
const rl = await ev(() => [game.room?.id, game.flags.chapterKey, game.rooms.desert.pump.state, game.rooms.desert.oasis.level.toFixed(2), T.obj()]);
check('save/load mid-chapter: flags kept, the pump still running and the oasis full', before === after && rl[2] === 'running' && rl[3] === '1.00', { before, after, rl });
// the dig's gate: the keypad, entered by the player (a wrong order first)
await said();
const kp1 = await ev(() => { const g = game.rooms.desert.dig.gate; const r = P.use(g.x, g.z, { kind: 'c4gate', run: true }); return { ...r, state: game.state, items: [...document.querySelectorAll('#shop .item')].map((b) => b.textContent) }; });
check('the keypad opens a choice of the worn keys\' orders (INPUT, no auto-entry)', kp1.state === 'shop' && kp1.items.length === 3 && kp1.items.some((t) => /4 · 1 · 7/.test(t)), kp1);
await view('adv2-04-keypad');
const kw = await ev(() => { const r = P.menuPick(0); return { ...r, open: game.flags.c4_digOpen, tries: game.flags.c4_codeTries, gate: game.rooms.desert.dig.gate.isOpen }; }); s = await said();
check('a wrong order: a buzz and a red light, the barrier stays down, the notebook is named (INPUT)', !kw.open && !kw.gate && kw.tries === 1 && has(s, /Wrong order\. Ilka's notebook has it/), { kw, s });
const j2 = await journal();
check('the journal: the notebook (its last page has the code) and that a wrong order buzzes', j2.includes('c4_j_notebook') && j2.includes('c4_j_code'), j2);
const kr = await ev(() => { const g = game.rooms.desert.dig.gate; P.use(g.x, g.z, { kind: 'c4gate' }); const st = game.state; const r = P.menuPick(1); return { st, ...r, open: game.flags.c4_digOpen, gate: game.rooms.desert.dig.gate.isOpen }; }); s = await said();
check('the notebook\'s order (4 · 1 · 7) opens the dig (INPUT)', kr.st === 'shop' && kr.open && kr.gate && has(s, /Four, one, seven/), { kr, s });
// ---- ADV-1: the five discs, by input
await said();
// throw at a disc as a player does: walk to a spot in front of it, face it, tap F (another spot if a throw misses)
const throwAt = (sel) => ev((sel) => {
  const G = game, D = G.rooms.desert.dig, tg = G.room.ballTargets.find((t) => t[sel[0]] === sel[1]);
  const key = () => JSON.stringify([G.flags.c4_seal0, G.flags.c4_seal1, G.flags.c4_seal2, G.flags.c4_coldHits]);
  const dx = D.x - tg.x, dz = D.z - tg.z, d = Math.hypot(dx, dz);
  for (let k = 0; k < 4; k++) {
    const sp = [0, 0.3, -0.3, 0.6][k], r = 2.6 + (k % 2) * 0.6, ca = Math.cos(sp), sa = Math.sin(sp);
    const ux = (dx * ca - dz * sa) / d, uz = (dx * sa + dz * ca) / d;
    P.go(tg.x + ux * r, tg.z + uz * r, { tol: 0.35, maxT: 40 }); P.settle();
    const f0 = key();
    for (let w = 0; w < 120 && G.ball.state !== 'idle'; w++) G.step(1 / 30);
    if (G.hero.behaviour !== 'normal') P.tap('F1');
    P.throwAt(tg.x, tg.z); P.settle();
    if (key() !== f0) return { k, r: 'hit' };
  }
  return { r: 'missed' };
}, sel);
const fl = () => ev(() => { const f = game.flags; return { s: [f.c4_seal0, f.c4_seal1, f.c4_seal2].map(Boolean), cold: f.c4_coldHits || 0, seals3: !!f.c4_seals3, bottom: !!f.c4_bottom, crack: !!f.c4_crack, on: game.rooms.desert.dig.seals.map((s) => s.on) }; });
const rim = await ev(() => { const n = P.npc('ilka'), g = game.rooms.desert.dig.gate; return { present: n?.present, d: +Math.hypot(n.pos.x - g.x, n.pos.z - g.z).toFixed(1) }; });
check('Ilka waits at the dig rim, clear of the keypad', rim.present && rim.d > 1.2 && rim.d < 5, rim);
const ik1 = await ev(() => P.talk('ilka')); const s1 = await said();
check('Ilka at the rim before he goes down: "go on down" (INPUT)', ik1.r === 'talked' && has(s1, /knees did those ramps/), { ik1, s1 });
// down the terraces on foot, past the crack beside the last ramp (mites on the way are fought as a player would)
const down = await ev(() => { const G = game, D = G.rooms.desert.dig, c = D.crack; let r; for (let k = 0; k < 4 && Math.abs(G.hero.pos.y - D.bottomY) > 0.8; k++) { r = P.go(c.x + (D.x - c.x) * 0.3, c.z + (D.z - c.z) * 0.3, { tol: 0.8, maxT: 120 }); P.settle(); } return { r: r?.r, y: +G.hero.pos.y.toFixed(2) }; });
let s2 = await said();
const down2 = await ev(() => { const D = game.rooms.desert.dig; const r = P.go(D.x, D.z, { tol: 1.0, maxT: 40 }); P.settle(); return r.r; });
s2 = s2.concat(await said());
let F = await fl();
const iC = s2.findIndex((l) => /Warm air from a crack/.test(l)), iB = s2.findIndex((l) => /Five stone discs on pillars/.test(l));
check('walking down: the warm crack is remarked on first, then the five discs (INPUT)', F.crack && F.bottom && iC >= 0 && iB > iC, { down, down2, F, s2 });
const F0 = F, n0 = F0.s.filter(Boolean).length;   // (a ball thrown at a mite on the way down may already have struck a disc: counted, not assumed)
check('the objective counts the door\'s seals (n/3)', new RegExp('seals \\(' + n0 + '\\/3\\)').test(await obj()), { obj: await obj(), F0 });
await shot('C4-04-dig.png');
const lin = await ev(() => { const c = game.rooms.desert.dig.carvings; return P.use(c.x, c.z, { kind: 'c4lintel' }); }); const s3 = await said();
check('the carving over the door can be inspected: five vents puffing (INPUT)', has(s3, /puffing like a kettle/), { lin, s3 });
const wi = F0.s.indexOf(false), w0 = await throwAt(['seal', wi]); F = await fl();
check('a warm disc opens and glows, counted in the objective (INPUT)', w0.r === 'hit' && F.s[wi] && F.on[wi] && new RegExp('\\(' + F.s.filter(Boolean).length + '\\/3\\)').test(await obj()), { wi, w0, F, obj: await obj() });
await said();
const c1 = await throwAt(['cold', 0]); const s4 = await said(); F = await fl();
check('a cold disc: a thud, and every open disc grinds shut (line, flags, glow) (INPUT)', c1.r === 'hit' && !F.s.some(Boolean) && !F.on.some(Boolean) && F.cold === 1 && has(s4, /open ones ground shut/), { c1, F, s4 });
check('after a cold disc the objective recalls what it does', (await obj()).includes('A cold disc shuts the others'), await obj());
const ik2 = await ev(() => P.talk('ilka', { run: true })); const s5 = await said();
check('Ilka\'s hint after a cold disc is the stronger one (walked back up, INPUT)', ik2.r === 'talked' && has(s5, /Leave the bare ones/), { ik2, s5 });
await ev(() => { const D = game.rooms.desert.dig; P.go(D.x, D.z, { tol: 1.0, maxT: 120 }); P.settle(); });
await throwAt(['seal', 0]); await throwAt(['seal', 1]); F = await fl();
check('two warm discs open (2/3) (INPUT)', F.s[0] && F.s[1] && !F.s[2], F);
const cold0 = F.cold;   // (a ball thrown at a mite on the way may have struck a cold disc too: counted, not assumed)
// Save & quit → Continue with two discs open, through the pause menu and the title screen as a player does
await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
const reloaded = page.waitForEvent('load', { timeout: 300000 });
await page.click('#pause [data-act="quit"]', { timeout: 60000 }); await reloaded;
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => { game.testFreeze = true; game.step(0.3); P.settle(); });
  await said();
};
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
await page.evaluate(() => { game.testFreeze = true; });
await page.click('[data-act="continue"]', { timeout: 180000 });
await reboot();
F = await fl();
const tg2 = await ev(() => game.room.ballTargets.filter((t) => t.seal != null).sort((a, b) => a.seal - b.seal).map((t) => !!t.done));
check('Save & quit → Continue: two discs still open (flags, glow, targets) and the cold count kept', F.s[0] && F.s[1] && !F.s[2] && F.on[0] && F.on[1] && !F.on[2] && tg2[0] && tg2[1] && !tg2[2] && F.cold === cold0, { F, tg2, cold0 });
check('Continue: the dig\'s barrier still up (open once, not twice)', await ev(() => game.rooms.desert.dig.gate.isOpen && game.flags.c4_digOpen), null);
const c2 = await throwAt(['cold', 1]); const s6 = await said(); const toast = await ev(() => (game.hud.toastLog || []).slice(-3)); F = await fl();
check('a cold disc again: both close, a toast this time instead of the speech (INPUT)', c2.r === 'hit' && !F.s[0] && !F.s[1] && F.cold === cold0 + 1 && !has(s6, /ground shut/) && toast.some((m) => /Cold disc: the seals closed/.test(m)), { c2, F, s6, toast });
const w2b = await throwAt(['seal', 2]); F = await fl();
// a death with one disc open: Retry continues from the last save, that disc still open
await ev(() => { const h = game.hero; h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(5, null); for (let i = 0; i < 200 && game.state !== 'gameover'; i++) game.step(1 / 30); });
await page.click('#gameover [data-act="retry"]', { timeout: 60000 });
await reboot();
const F2 = await fl();
check('death → Retry: the open disc and the cold count come back from the save (ISO death)', w2b.r === 'hit' && F.s[2] && F2.s[2] && !F2.s[0] && F2.on[2] && F2.cold === F.cold, { w2b, F, F2 });
check('death → Retry: the pump still runs (no gust, no spray)', (await pumpState()).state === 'running', await pumpState());
await throwAt(['seal', 0]); await throwAt(['seal', 1]); await ev(() => { game.step(0.5); P.settle(); });
F = await fl();
check('the three warm discs open the temple door (INPUT)', F.seals3 && F.s.every(Boolean), F);
const jr = await journal();
check('the journal recalls the crack, the discs and what a cold disc does (not the answer)', ['c4_j_ilka', 'c4_j_crack', 'c4_j_discs', 'c4_j_cold'].every((k) => jr.includes(k)), jr);
await said();
// the seals open the Temple of Bù's gate: walk in, read the great carving inside
const tin = await ev(() => { const G = game, d = G.rooms.desert.dig.door; P.settle(); const r = P.through(d.x, d.z); return [G.room?.id, G.flags.c4_templeSeen, r.r, document.querySelector('#objective')?.textContent || '']; });
log('temple', tin);
check('into the temple through the opened door (INPUT)', tin[0] === 'butemple' && tin[1], tin);
await shot('C4-05-temple.png');
log('carving', await ev(() => { const G = game, c = G.rooms.butemple.carving; const r = P.use(c.x, c.z, { kind: 'c4carve' }); G.step(2); P.settle(); return [G.flags.c4_carving, G.flags.c4_done, r.r]; }));
const s7 = await said();
check('the carving: Twinsen ties the cold discs to the closing vents', has(s7, /two of the discs out there were cold/), s7);
await shot('C4-05-carving.png');
const nx = await ev(() => { const G = game; G.step(1.5); P.settle(); return [G.flags.chapterKey, G.room?.id, document.querySelector('#objective')?.textContent || '']; });
log('next', nx);
check('chapter 5 follows', nx[0] === 'steam', nx);

// ---- ADV-2: old saves (format 3, made by the build before ADV-2: docs/lba3-production/reviews/REV-TY-4)
const saveOf = (file) => { const d = JSON.parse(fs.readFileSync(REV4 + file, 'utf8')); for (const o of d.origins) for (const kv of o.localStorage) if (kv.name === 'lba3_save_v1') return JSON.parse(kv.value); throw new Error('no save in ' + file); };
const continueFrom = async (save) => {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 480000 });
  await ev((v) => { localStorage.setItem('lba3_save_v1', v); }, JSON.stringify(save));
  await boot('continue'); await ev(() => { T.talkAll(); P.settle(); }); await said();
};
// (1) the chapter's start: the pump fixed before Tarra asks (any order)
await continueFrom(saveOf('save-k1.json'));
ps = await pumpState();
check('old save (format 3), chapter 4 start: the pump is jammed, its gear target live', ps.state === 'jammed' && !ps.target && !ps.pump, ps);
const o1 = await throwGear('gear', 1); s = await said(); ps = await pumpState();
check('old save: the jammed gear frees before Tarra has asked (INPUT)', o1.r === 'hit' && ps.state === 'leak' && has(s, /Sand bursts out/), { o1, ps, s });
const o2 = await ev(() => { const J = game.rooms.desert.pump.joint; return P.use(J.x, J.z, { kind: 'c4joint', run: true }); }); ps = await pumpState();
check('old save: the joint pushed home (INPUT)', o2.r === 'used' && ps.pump && ps.state === 'running', { o2, ps });
const o3 = await ev(() => P.talk('tarra', { run: true })); s = await said();
check('Tarra, asked after the pump already runs: "before anyone asked you?", then her trust and Ilka (INPUT)', o3.r === 'talked' && has(s, /Before anyone asked you/) && has(s, /The one you want is Ilka/) && (await ev(() => !!(game.flags.c4_trust && game.flags.c4_pumpTask))), { o3, s });
check('the objective moves on to Ilka', /Ilka/.test(await obj()), await obj());
// (2) an older build's mid-pump state: the sound gears' old flags (0 and 2) set, the jammed one not
const k1 = saveOf('save-k1.json'); Object.assign(k1.flags, { c4_pumpTask: true, c4_gear0: true, c4_gear2: true });
await continueFrom(k1);
ps = await pumpState();
check('old mid-pump save (gears 0 and 2 freed under the old rule): still jammed, objective "Restart the wind-pump"', ps.state === 'jammed' && !ps.target && (await obj()) === 'Restart the wind-pump', { ps, obj: await obj() });
const o4 = await throwGear('gear', 1); ps = await pumpState();
check('old mid-pump save: completable (the jammed gear frees, INPUT)', o4.r === 'hit' && ps.state === 'leak', { o4, ps });
// (3) the notebook taken, the gate still shut (format 3: the gate was auto-entered then)
await continueFrom(saveOf('save-k6.json'));
ps = await pumpState();
const k6 = await ev(() => ({ open: game.rooms.desert.dig.gate.isOpen, oasis: +game.rooms.desert.oasis.level.toFixed(2), obj: T.obj() }));
check('old save with the notebook: the pump runs, the oasis is full, the dig still shut', ps.state === 'running' && k6.oasis === 1 && !k6.open, { ps, k6 });
const o5 = await ev(() => { const g = game.rooms.desert.dig.gate; P.use(g.x, g.z, { kind: 'c4gate', run: true }); const st = game.state; const r = P.menuPick(1); return { st, ...r, open: game.flags.c4_digOpen && game.rooms.desert.dig.gate.isOpen }; });
check('old save with the notebook: the keypad asks, 4 · 1 · 7 opens the dig (INPUT)', o5.st === 'shop' && o5.open, o5);
// (4) the keypad before the notebook: the worn keys, no menu (placed by the gate: ISO; pressed: INPUT)
await continueFrom(saveOf('save-k1.json'));
const o6 = await ev(() => { const g = game.rooms.desert.dig.gate; T.tp(g.x - 1.2, g.z + 0.2); const r = P.use(g.x, g.z, { kind: 'c4gate' }); return { ...r, st: game.state, worn: !!game.flags.c4_worn, open: !!game.flags.c4_digOpen }; }); s = await said();
check('the keypad without the notebook: the 1, 4 and 7 worn shiny, no menu, the gate shut (INPUT)', o6.r === 'used' && o6.st === 'play' && o6.worn && !o6.open && has(s, /1, 4 and 7 are worn shiny/), { o6, s });
check('the journal keeps the worn keys', (await journal()).includes('c4_j_worn'), await journal());
console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails || errs.length ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails || errs.length ? 1 : 0);
