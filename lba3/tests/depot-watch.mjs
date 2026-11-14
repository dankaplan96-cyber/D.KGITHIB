// P9 (the user, 7.11.2026): the project depot's watch (src/game/story/depotwatch.js). "Why are there enemies, what do
// they want, what did I do wrong? They don't exist before the water valve is needed and vanish afterwards even if I
// didn't kill them."
//   1. the watch (two drones, the guard, his dog) is at the depot from the first chapter, before any valve is asked for
//   2. the path through the depot is public: walked by input from gate to gate, nobody minds him (no warning, no fight)
//   3. into the yard past the yellow line, seen: the guard warns him and turns him out at a gate; nobody hurt, no fight
//   4. back in the yard after the warning: "I warned you!" and the watch fights
//   5. away from the depot the fight ends: the watch is back on its round, calm again
//   6. Save & quit → Continue: the watch is still there, the warning remembered (c1_depotWarned)
//   7. chapter 2, the valve turned (INPUT, fighting whoever is at him on the way): the station radios the guard and the
//      watch walks off toward the station gate: in view they walk (nobody vanishes on screen), once out of view they
//      are gone; nobody was knocked out by it
//   8. Save & quit → Continue after the valve: the watch is not at the depot; a later chapter neither; an old save made
//      before the valve (no c1_depotWarned flag) loads with the watch there and calm
// ISO (logged): the start is put at the depot's west gate; the chapter-2 flags are set; his health is topped up.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS || '';
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${n}.png` }); };
await open(page, '?nocine'); await menu(page, 'new');
const quitContinue = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 300000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000 });
  await reloaded;
  await open(page, '?nocine'); await menu(page, 'continue');
  await ev(() => { P.settle(); });
};
await ev(() => { window._said = []; const G = game, sv = G.say; G.say = function (n, lines, ...a) { window._said.push(...[].concat(lines).map((l) => String(l))); return sv.call(this, n, lines, ...a); };
  window.W8 = {
    m: () => G.enemies.filter((e) => e.def?.watch),
    sum: () => W8.m().map((e) => `${e.id}:${e.present ? 'P' : '-'}${e.rig.root.visible ? 'V' : ''}${e.alive ? '' : 'x'}:${e.state}`),
    fighting: () => W8.m().filter((e) => e.present && e.alive && ['alerted', 'chase', 'aim', 'windup', 'strike', 'warn', 'lunge'].includes(e.state)).map((e) => e.id + ':' + e.state),
    said: () => window._said.splice(0),
  };
});

// ---- 1. the first chapter: the watch is there
const s1 = await ev(() => { const G = game, D = G.world.depot; P.settle(); const g = D.gates[0];
  P.note('ISO: put at the depot\'s west gate (outside)'); G.exitRoom({ x: g.out.x - 3, z: g.out.z, a: Math.PI / 2 }, true); P.settle(); G.step(1);
  return { key: G.flags.chapterKey, watch: W8.sum(), zone: G.story.depot.zone() }; });
check('1. chapter 1 (the well), before any valve is asked for: the depot\'s watch is there (two drones, the guard, his dog), calm', s1.key === 'well' && s1.watch.length === 4 && s1.watch.every((x) => /:PV:(patrol|guard)$/.test(x)), s1);
await shot('W-1-watch');

// ---- 2. the public path, gate to gate, by input
const s2 = await ev(() => { const G = game, D = G.world.depot, h = G.hero, hp0 = h.hp, A = D.gates[0], B = D.gates[1]; let worst = []; W8.said();
  const pts = [[A.out.x, A.out.z], [A.in.x, -75.6], [-75, -75.6], [B.in.x, -75.4], [B.out.x, B.out.z]];
  let r; for (const [x, z] of pts) { r = P.go(x, z, { tol: 0.7, fight: false, maxT: 40 }); const f = W8.fighting(); if (f.length) worst = f; if (G.state !== 'play') break; }
  return { r: r.r, hp: [hp0, h.hp], warned: !!G.flags.c1_depotWarned, fighting: worst, said: W8.said(), zone: G.story.depot.zone(), at: [h.pos.x, h.pos.z].map((v) => +v.toFixed(1)) }; });
check('2. the path through the depot is public: walked from the west gate to the east gate (INPUT), no warning, nobody comes at him, not hurt', s2.r === 'arrived' && !s2.warned && !s2.fighting.length && s2.hp[1] >= s2.hp[0] && !s2.said.length, s2);
// ---- 2b. P17 (the user, 12.11): the valve is not turned from the path. Walked (INPUT) to the rail on the line right in
// front of it and faced to it: the key offers no valve there, and it is still the public path
const s2b = await ev(() => { const G = game, D = G.world.depot, h = G.hero, v = G.world.valves.find((q) => q.id === 'depot'), R = G.world.depotRail;
  const r = P.go(v.x, R.z - 0.6, { tol: 0.3, fight: false, maxT: 30 });
  P.go(v.x, v.z, { tol: 0.2, fight: false, maxT: 2 }); P.release(); G.step(0.2); P.face(v.x, v.z); G.step(0.1);
  const it = G.findInteractable();
  return { r: r.r, rail: !!R, at: [h.pos.x, h.pos.z].map((q) => +q.toFixed(2)), line: D.yard.z0, offered: it ? `${it.kind}:${it.id ?? it.valve?.id ?? ''}` : null, zone: G.story.depot.zone(), warned: !!G.flags.c1_depotWarned }; });
check('2b. at the rail in front of the depot valve, on the path side of the line (INPUT): no valve offered, the zone is the path, no warning', s2b.rail && s2b.at[1] < s2b.line && !/valve:depot/.test(s2b.offered || '') && s2b.zone !== 'yard' && !s2b.warned, s2b);

// ---- 3. into the yard: warned and turned out
const s3 = await ev(() => { const G = game, D = G.world.depot, h = G.hero, hp0 = h.hp; W8.said();
  // in through the east gate and across the line, toward Funfrock's old chest; then he stands looking about
  let r = P.go(-75, -68.5, { tol: 0.8, fight: false, maxT: 60 });
  for (let i = 0; i < 60 * 30 && G.state === 'play' && !G.trans; i++) G.step(1 / 30);
  const inYard = r.r, st = G.state; const s = P.settle(); P.settle();
  return { go: inYard, state: st, settle: s, warned: !!G.flags.c1_depotWarned, said: W8.said(), zone: G.story.depot.zone(), hp: [hp0, h.hp], fighting: W8.fighting(), hostile: G.story.depot.hostile, at: [h.pos.x, h.pos.z].map((v) => +v.toFixed(1)), watch: W8.sum() }; });
check('3. into the yard past the yellow line (INPUT), seen: the guard warns him ("staff only", or "hands off the valve" by it) and turns him out at a gate; not hurt, nobody fights',
  s3.warned && s3.zone === 'out' && s3.hp[1] >= s3.hp[0] && !s3.fighting.length && !s3.hostile && s3.said.some((l) => /staff only|hands off/i.test(l)) && s3.said.some((l) => /yellow line/i.test(l)), s3);
await shot('W-3-turned-out');

// ---- 4. back in: a fight
const s4 = await ev(() => { const G = game, h = G.hero; W8.said();
  let r = P.go(-75, -68.5, { tol: 0.8, fight: false, maxT: 60 });
  for (let i = 0; i < 60 * 30 && G.state === 'play' && !G.story.depot.hostile; i++) G.step(1 / 30);
  P.settle(); G.step(0.8);
  return { go: r.r, said: W8.said(), hostile: G.story.depot.hostile, fighting: W8.fighting() }; });
check('4. back in the yard after the warning: "I warned you!" and the watch comes at him', s4.hostile && s4.fighting.length > 0 && s4.said.some((l) => /warned you/i.test(l)), s4);

// ---- 5. away: calm again
const s5 = await ev(() => { const G = game, h = G.hero, D = G.world.depot; let t = 0;
  P.note('ISO: health topped up for the run away'); h.hp = Math.max(h.hp, 6);
  const r = P.go(D.gates[0].out.x - 22, D.gates[0].out.z + 4, { tol: 1.5, run: true, fight: false, maxT: 90 });
  for (; t < 60 && G.story.depot.hostile; t += 0.5) { G.step(0.5); if (G.state !== 'play') P.settle(); }
  return { go: r.r, t, hostile: G.story.depot.hostile, watch: W8.sum(), dead: h.dead }; });
check('5. away from the depot the fight ends: the watch goes back to its round, calm', !s5.hostile && !s5.dead && s5.watch.filter((x) => /:P/.test(x)).every((x) => /:(patrol|guard|home)$/.test(x)), s5);

// ---- 6. Save & quit → Continue: still there, the warning remembered
await ev(() => { game.save(false); });
await quitContinue();
const s6 = await ev(() => ({ key: game.flags.chapterKey, warned: !!game.flags.c1_depotWarned }));
await ev(() => { window._said = []; const G = game, sv = G.say; G.say = function (n, lines, ...a) { window._said.push(...[].concat(lines).map((l) => String(l))); return sv.call(this, n, lines, ...a); };
  window.W8 = { m: () => G.enemies.filter((e) => e.def?.watch), sum: () => W8.m().map((e) => `${e.id}:${e.present ? 'P' : '-'}${e.rig.root.visible ? 'V' : ''}${e.alive ? '' : 'x'}:${e.state}`), fighting: () => W8.m().filter((e) => e.present && e.alive && ['alerted', 'chase', 'aim', 'windup', 'strike', 'warn', 'lunge'].includes(e.state)).map((e) => e.id + ':' + e.state), said: () => window._said.splice(0) }; });
s6.watch = await ev(() => W8.sum());
check('6. Save & quit → Continue: the watch is still at the depot, and the warning is remembered', s6.key === 'well' && s6.warned && s6.watch.length === 4 && s6.watch.every((x) => /:PV:/.test(x)), s6);

// ---- 7. chapter 2: the valve, and the radio call
const s7 = await ev(() => { const G = game, f = G.flags, h = G.hero, D = G.world.depot, v = G.world.valves.find((q) => q.id === 'depot'); P.settle();
  P.note('ISO: chapter 2 set by its flags (Vesk\'s task given); health topped up');
  Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'project', c1_started: true, c1_home: true, c1_arrived: true, c1_task: true }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'project');
  G.hero.hasBall = true; G.story.refreshCast(); h.hp = h.maxHp ?? 10; W8.said();
  // (as a player who was warned would: Discreet, in by the east gate while the round has the watch at the yard's far
  //  side; seen, he backs off to the path and waits for them to calm down: the guard must be standing for the radio)
  let r = { r: 'none' }, tries = 0; const live = () => W8.m().filter((e) => e.present && e.alive);
  const EG = D.gates[1];
  for (; tries < 10 && !v.open && !h.dead; tries++) {
    P.go(EG.out.x + 1, EG.out.z, { tol: 0.8, fight: false, maxT: 60 }); P.settle();
    for (let i = 0; i < 900 && G.story.depot.hostile; i++) { G.step(0.1); if (G.state !== 'play') P.settle(); }
    for (let i = 0; i < 900 && !live().every((e) => e.pos.x < -74.5); i++) G.step(0.1);
    if (h.behaviour !== 'discreet') P.tap('F4');
    r = P.go(v.x + 0.8, v.z - 0.7, { tol: 0.3, fight: false, maxT: 30 });
    if (G.state === 'play' && !G.story.depot.hostile) { P.face(v.x, v.z); P.tap('KeyE', 0.1); for (let k = 0; k < 150 && h.actT > 0 && G.state === 'play'; k++) G.step(1 / 30); }
    P.settle(); h.hp = Math.max(h.hp, 6);
  }
  const said = W8.said();
  const at0 = W8.m().map((e) => ({ id: e.id, v: e.rig.root.visible, x: e.pos.x, z: e.pos.z }));
  // the camera on the east gate, the way they go: in view they walk
  const V3 = G.camRig.cam.position.constructor, E = D.gates[1], gy = G.physics.groundAt(E.out.x, E.out.z);
  G.camRig.override = { pos: new V3(E.out.x + 9, gy + 9, E.out.z + 12), look: new V3(E.out.x - 3, gy, E.out.z - 2) };
  G.step(0.5); G.camRig.cam.position.copy(G.camRig.override.pos); G.camRig.cam.lookAt(G.camRig.override.look);
  const inView = []; for (let i = 0; i < 6; i++) { G.step(0.5); inView.push(W8.m().filter((e) => e.rig.root.visible && !G.story.cur.unseen(e.pos)).length); }
  const mid = W8.m().map((e) => ({ id: e.id, v: e.rig.root.visible, x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), unseen: G.story.cur.unseen(e.pos) }));
  const popped = mid.filter((m) => !m.v && at0.find((a) => a.id === m.id)?.v);   // (gone between the samples)
  // the camera away (on the town): out of view, they are gone
  G.camRig.override = { pos: new V3(h.pos.x - 30, 40, h.pos.z + 60), look: new V3(h.pos.x - 60, 0, h.pos.z + 120) };
  G.step(0.5); G.camRig.cam.position.copy(G.camRig.override.pos); G.camRig.cam.lookAt(G.camRig.override.look);
  for (let i = 0; i < 20 && W8.m().some((e) => e.rig.root.visible); i++) G.step(0.5);
  G.camRig.override = null;
  return { tries, r: r?.r, hostileEnd: G.story.depot.hostile, open: v.open, dead: h.dead, said, at0: at0.map((a) => `${a.id}:${a.v ? 'V' : '-'}`), inView, mid, popped: popped.map((p) => p.id), after: W8.sum(), killed: G.killed.filter((k) => W8.m().some((e) => e.id === k)), leaving: G.story.depot.leaving.length }; });
check('7a. chapter 2: the depot valve turned (INPUT); the station radios the guard ("that\'s Twinsen: let it run", "up to the station gate")', s7.open && s7.said.some((l) => /let it run/i.test(l)) && s7.said.some((l) => /station gate/i.test(l)), { tries: s7.tries, open: s7.open, said: s7.said });
check('7b. the watch walks off toward the station: still there and walking while in view, gone only once out of view; none knocked out by it',
  s7.inView.length && s7.inView[0] > 0 && s7.mid.some((m) => m.v) && s7.after.every((x) => /:-:/.test(x)) && !s7.killed.length && s7.leaving === 0, s7);
await shot('W-7-after');

// ---- 8. after the valve: a reload, a later chapter, and an old save from before it
await ev(() => { game.save(false); });
await quitContinue();
const s8 = await ev(() => { const G = game, m = G.enemies.filter((e) => e.def?.watch); const a = { key: G.flags.chapterKey, valve: !!G.flags.c1_valve_depot, watch: m.map((e) => `${e.id}:${e.present ? 'P' : '-'}${e.rig.root.visible ? 'V' : ''}`) };
  const f = G.flags; Object.assign(f, { chapterKey: 'dig' }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'dig'); delete f.c1_valve_depot; G.story.refreshCast();
  a.later = m.map((e) => `${e.id}:${e.present ? 'P' : '-'}`);
  // an old save from chapter 2, before the valve, made before P9 (no c1_depotWarned)
  for (const k of Object.keys(f)) if (/^c1_(depotWarned|valve_depot|water)$/.test(k)) delete f[k];
  G.killed = G.killed.filter((k) => !m.some((e) => e.id === k));   // (ISO: the old save's own record: nobody of the watch beaten)
  Object.assign(f, { chapterKey: 'project', c1_started: true, c1_home: true, c1_arrived: true, c1_task: true }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'project');
  G.save(false); return a; });
await page.reload(); await open(page, '?nocine'); await menu(page, 'continue');
const s8b = await ev(() => { P.settle(); const G = game, m = G.enemies.filter((e) => e.def?.watch); return { key: G.flags.chapterKey, state: G.state, warned: !!G.flags.c1_depotWarned, watch: m.map((e) => `${e.id}:${e.present ? 'P' : '-'}${e.rig.root.visible ? 'V' : ''}:${e.state}`), hostile: G.story.depot.hostile }; });
check('8a. Save & quit → Continue after the valve: the watch is not at the depot (it went to the station)', s8.key === 'project' && s8.valve && s8.watch.every((x) => /:-$/.test(x)), s8);
check('8b. a later chapter (4) without the valve flag: no depot watch (it belongs to chapters 1–2)', s8.later.every((x) => /:-$/.test(x)), s8.later);
check('8c. an old chapter-2 save from before the valve, without c1_depotWarned: loads, the watch is there and calm', s8b.key === 'project' && s8b.state === 'play' && !s8b.warned && !s8b.hostile && s8b.watch.length === 4 && s8b.watch.every((x) => /:PV:(patrol|guard)$/.test(x)), s8b);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
