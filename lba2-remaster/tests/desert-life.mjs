// Desert Island twelve years on (src/game/keshlife.js, story/kesh.js): Kesh's cool room in FunFrock's old
// blockhouse and The Wind-Catcher, played by input (walking, the stair, E, talking) in both valid orders, with
// Save & quit → Continue in the middle; its lines before and after the chapter events (the pump in chapter 4, the
// steam and the vent in chapter 5); the main story's people unchanged (Tarra's pump, Brosk's jar and shovel come
// first); the new places solid; the reward owed until picked up. REV-TY-4 fixes: the door's hint and Brosk follow how
// the cowl stands (wrong way / into the wind with no screen / screen on, wrong way); Save & Continue with the screen
// fitted but not yet turned; Hesk's poles clear of all four yacht lines.
// ISO (logged): chapters 4 and 5 are reached by setting their flags (as tests/chapter4.mjs and chapter5.mjs do);
// the pump's three gears (chapter 4) and the vent (chapter 5) are set by flags; a fresh flag set for the second
// order. Screenshots: SHOTS=1 writes them to captures/desert-ty/.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS ? fileURLToPath(new URL('../captures/desert-ty/', import.meta.url)) : null;
// a screenshot from the normal camera with Twinsen standing at desert-local (x, z) facing a (or on the cool room's roof)
const shot = async (name, spec) => {
  if (!SHOTS) return;
  await ev((s) => { const G = game, h = G.hero, C = G.rooms.desert.kesh.cool;
    if (s.roof) { h.pos.set(C.use.x - 0.7, C.roofY, C.use.z + 1.6); h.angle = Math.PI * 0.72; }   // (from the north-west: the cowl's mouth in view)
    else { const x = 3400 + s.x; h.pos.set(x, G.physics.groundAt(x, s.z, 30), s.z); h.angle = s.a; }
    h.onGround = true; h.vy = 0; G.camRig.lba.init = false; G.step(1.2); G.renderer.render(); }, spec);
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 180000 });
};
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const toasts = () => ev(() => (game.hud.toastLog || []).slice());

await open(page, '?nocine'); await menu(page, 'new');
iso('chapter 3 finished by flags (as tests/chapter4.mjs): the sealed shaft sends Twinsen to Desert Island (chapter 4)');
await ev(() => { const G = game; P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); P.settle();
  Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true });
  G.story.cur.toShell(); P.settle(); G.step(1.5); P.settle(); });
await said();
const at = await ev(() => ({ room: game.room?.id, ch: game.flags.chapterKey, started: !!game.flags.c4_started }));
check('chapter 4 starts on Desert Island', at.room === 'desert' && at.ch === 'dig' && at.started, at);

// ---- the places
const K0 = await ev(() => { const K = game.rooms.desert.kesh, C = K.cool, PH = game.physics, gy = (x, z) => PH.terrain.heightAt(x, z);
  const lumi = P.npc('weaver');
  return { roofY: +C.roofY.toFixed(2), dir: C.dir, jars: game.rooms.desert.group.children.length > 0,
    body: PH.blockedAt(C.door.x, C.door.z - 2.5, gy(C.door.x, C.door.z), 0.1),
    stair: PH.blockedAt(C.stairMid.x + 0.2, C.stairMid.z, gy(C.stairMid.x + 1.2, C.stairMid.z), 0.1),   // (its high end can't be walked under)
    loom: PH.blockedAt(K.loom.x, K.loom.z, gy(K.loom.x, K.loom.z), 0.1),
    pole: PH.blockedAt(K.poles[0].x, K.poles[0].z, gy(K.poles[0].x, K.poles[0].z), 0.1), poles: K.poles.length,
    lumi: { anim: lumi.forceAnim, d: +Math.hypot(lumi.pos.x - K.lumi.x, lumi.pos.z - K.lumi.z).toFixed(2), present: lumi.present } }; });
check('the cool room (and its stair, from the side), Lumi\'s loom and Hesk\'s flag poles are solid; Lumi works at her loom', K0.body && K0.stair && K0.loom && K0.pole && K0.poles >= 6 && K0.lumi.present && K0.lumi.anim === 'tinker' && K0.lumi.d < 0.3, K0);
await shot('01-arrival-coolroom', { x: -80, z: 4, a: Math.PI / 2 + 0.35 });
// the yacht's four lines (out to the camp and the dig, and back from each) keep clear of every pole
const P0 = await ev(async () => { const m = await import('/src/game/keshlife.js'); const D = game.rooms.desert, K = D.kesh, ox = D.plaza.x + 50, oz = D.plaza.z - 2;
  let min = Infinity, at = null, n = 0;
  for (const [key, P] of Object.entries(m.YACHT_ROUTES)) for (let i = 0; i < P.length - 1; i++) {
    const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    for (let d = 0; d <= L; d += 0.2) { const x = P[i][0] + (P[i + 1][0] - P[i][0]) * d / L, z = P[i][1] + (P[i + 1][1] - P[i][1]) * d / L; n++;
      for (const p of K.poles) { const r = Math.hypot(p.x - ox - x, p.z - oz - z); if (r < min) { min = r; at = { key, pole: [+(p.x - ox).toFixed(1), +(p.z - oz).toFixed(1)] }; } } }
  }
  const dig = D.yacht.spot('dig'), camp = D.yacht.spot('camp');
  return { min: +min.toFixed(2), at, n, clear: m.POLE_CLEAR, poles: K.poles.length, ridesShared: dig.x - ox === m.YACHT_ROUTES.toDig.at(-1)[0] && camp.z - oz === m.YACHT_ROUTES.toCamp.at(-1)[1] }; });
check('Hesk\'s poles stand clear of all four yacht lines, out and back (more than the yacht\'s 1.6 m half-width)', P0.min >= P0.clear && P0.clear > 1.6 + 0.3 && P0.poles >= 6 && P0.ridesShared, P0);

// chapter 4, before the pump: Kesh doesn't trust the ferry's people yet
const d1 = await ev(() => { const f = game.flags; const r = P.talk('dtrader'); return { r: r.r, ask: !!f.k_ask, jars: game.rooms.desert.kesh.cool && game.story.kesh._jars }; });
const d1l = await said();
check('chapter 4 (pump seized): Brosk tells of the cool room — the last two jars going warm, the wind-catcher turned, Lumi\'s screen torn off (INPUT)', d1.r === 'talked' && d1.ask && d1.jars === 2 && d1l.some((l) => /last two jars/.test(l)) && d1l.some((l) => /pump seized/.test(l)) && d1l.some((l) => /Lumi's screen/.test(l)), { d1, d1l });
const d2 = await ev(() => { const r = P.talk('weaver'); return { r: r.r, screen: !!game.flags.k_screen }; });
const d2l = await said();
check('…and Lumi keeps her work from someone off the project\'s ferry (no screen yet)', d2.r === 'talked' && !d2.screen && d2l.some((l) => /won't talk to anyone/.test(l)), { d2, d2l });
const d3 = await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); return { r: r.r, label: r.target?.label }; });
const d3l = await said();
check('the door: FunFrock\'s old blockhouse, dug out of the dune; two jars on the shelf; the mouth turned the wrong way (INPUT)', d3.r === 'used' && d3l.some((l) => /FunFrock's blockhouses/.test(l)) && d3l.some((l) => /two jars of water on the shelf/i.test(l)) && d3l.some((l) => /turned the wrong way/.test(l)), { d3, d3l });

// ---- order A: up the stair, the cowl into the wind without a screen → sand
const a1 = await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero, f = game.flags;
  const y0 = h.pos.y;
  const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 });
  const onRoof = h.pos.y > C.roofY - 0.3;
  const label = r.target?.label;
  for (let i = 0; i < 5 && (f.k_dir ?? 2) !== 0; i++) { P.wait(0.8); P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); }
  P.wait(1.5);
  return { r: r.r, label, y0: +y0.toFixed(2), y: +h.pos.y.toFixed(2), onRoof, dir: f.k_dir, turns: f.k_turns, sand: !!f.k_sand, done: !!f.k_done, cowl: C.dir }; });
const a1l = await said();
check('up the stair on the east wall to the roof by walking; the crank turns the cowl a quarter at a time (INPUT)', a1.onRoof && a1.label === 'p_turn' && a1.turns === 2 && a1.dir === 0 && a1.cowl === 0, a1);
check('into the wind with no screen: sand pours down the tower into the room (a setback, not the end)', a1.sand && !a1.done && a1l.some((l) => /half a dune/.test(l)) && a1l.some((l) => /needs a screen/.test(l)), { a1, a1l });
// the roof's parapet holds him: walking at it from the crank does not drop him off
const a2 = await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero; h.angle = 0; P.holdFor(['ArrowUp'], 1.5); const north = +h.pos.y.toFixed(2); h.angle = -Math.PI / 2; P.holdFor(['ArrowUp'], 1.5); const west = +h.pos.y.toFixed(2); h.angle = Math.PI; P.holdFor(['ArrowUp'], 2.0); const south = +h.pos.y.toFixed(2); return { north, west, south, roofY: C.roofY, hp: h.hp }; });
check('the roof\'s parapet keeps him on the roof (north, west and south edges, INPUT)', [a2.north, a2.west, a2.south].every((y) => Math.abs(y - a2.roofY) < 0.05), a2);
await shot('03-roof-sand', { roof: true });
const a3 = await ev(() => { const f = game.flags; const r = P.talk('dtrader'); return { r: r.r, pile: game.rooms.desert.kesh.cool && f.k_sand }; });
const a3l = await said();
check('Brosk notices the sand in his dates and, the mouth now into the wind, points to Lumi\'s screens (not "the opposite")', a3.r === 'talked' && a3l.some((l) => /In my dates/.test(l)) && a3l.some((l) => /Lumi's screens/.test(l)) && !a3l.some((l) => /opposite|wrong way/.test(l)), { a3, a3l });
const a3d = await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); return { r: r.r, dir: game.flags.k_dir }; });
const a3dl = await said();
check('the door with sand in and the mouth into the wind: the hint is the missing screen, not "the wrong way" (INPUT)', a3d.r === 'used' && a3d.dir === 0 && a3dl.some((l) => /Sand on the floor/.test(l)) && a3dl.some((l) => /no screen on it/.test(l)) && !a3dl.some((l) => /wrong way/.test(l)), { a3d, a3dl });
iso('the door hint in the other cowl states: k_dir / k_fit set for a moment and story/kesh.js asked (then put back)');
const a3h = await ev(() => { const f = game.flags, K = game.story.kesh, save = { d: f.k_dir, fit: f.k_fit }; const out = {};
  for (const [d, fit] of [[0, false], [1, false], [2, false], [3, true], [2, true]]) { f.k_dir = d; f.k_fit = fit; out[d + (fit ? 'fit' : '')] = K.hint(); }
  f.k_dir = save.d; if (save.fit) f.k_fit = save.fit; else delete f.k_fit; return out; });
check('the hint follows the cowl: into the wind means the screen; any other way, the wrong way (screen on or not)', a3h['0'] === 'k_door_hint_screen' && a3h['1'] === 'k_door_hint' && a3h['2'] === 'k_door_hint' && a3h['3fit'] === 'k_door_hint_fit' && a3h['2fit'] === 'k_door_hint_fit', a3h);

// save & Continue with sand in the room and the cowl into the wind
let file = path.join(os.tmpdir(), 'desertlife-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
const a4 = await ev(() => { P.settle(); const f = game.flags, C = game.rooms.desert.kesh.cool; return { room: game.room?.id, dir: f.k_dir, cowl: C.dir, sand: !!f.k_sand, ask: !!f.k_ask, journal: game.story.journal().find((j) => j.title === 'Kesh')?.lines }; });
check('Save & quit → Continue: the cowl still faces the wind, the sand is still in the room, the journal has it', a4.room === 'desert' && a4.dir === 0 && a4.cowl === 0 && a4.sand && a4.journal?.some((l) => l.key === 'k_j_cool' && !l.done), a4);

// the pump runs (chapter 4's own errand, ISO here: tests/chapter4.mjs plays it); Kesh changes
iso('chapter 4: the wind-pump\'s three gears and Tarra\'s trust set by flags (c4_gear0-2, c4_pump, c4_pumpTask, c4_trust)');
await ev(() => { const G = game; Object.assign(G.flags, { c4_pumpTask: true, c4_gear0: true, c4_gear1: true, c4_gear2: true, c4_pump: true, c4_trust: true }); G.story.applyFlags(); G.step(0.5); });
const b1 = await ev(() => { const f = game.flags; const r = P.talk('weaver'); return { r: r.r, screen: !!f.k_screen, items: game.story.items().map((i) => i.id), jars: game.story.kesh._jars }; });
const b1l = await said();
check('with water in the oasis the cool room holds five jars; Lumi hands over her new screen (INPUT)', b1.r === 'talked' && b1.screen && b1.items.includes('kscreen') && b1.jars === 5 && b1l.some((l) => /That's what happens without a screen/.test(l)) && b1l.some((l) => /knees/.test(l)), { b1, b1l });
const hp0 = await ev(() => { const h = game.hero; h.hp = Math.max(1, h.maxHp - 4); return h.hp; });
const b2 = await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(1); return { t: (game.hud.toastLog || []).slice(), r: r.r, label: r.target?.label, fit: !!f.k_fit, done: !!f.k_done, sand: !!f.k_sand, at: [game.hero.pos.x, game.hero.pos.y, game.hero.pos.z].map((v) => +v.toFixed(2)), trace: P.trace.slice(-8) }; });
const b2l = await said();
check('on the roof the screen goes over the mouth; already into the wind, the room draws at once (INPUT)', b2.label === 'p_fit' && b2.fit && b2.done && b2l.some((l) => /curtain in the door lifts/.test(l)), { b2, b2l });
const b3 = await ev(() => { const G = game, K = G.rooms.desert.kesh, sani = P.npc('dkid'), f = G.flags;
  return { sani: { d: +Math.hypot(sani.pos.x - K.cool.sani.x, sani.pos.z - K.cool.sani.z).toFixed(2), anim: sani.forceAnim }, items: G.story.items().map((i) => i.id), t: [...G.hud.toastEl.children].map((c) => c.textContent) }; });
check('after: Sani plays in the cool room\'s doorway; the screen is no longer carried; a toast says the room draws', b3.sani.d < 0.3 && b3.sani.anim === 'kneelWork' && !b3.items.includes('kscreen') && b2.t.some((s) => /draws again/.test(s)), { b3, t: b2.t });   // (the toast read in the same step: it fades after 2.8 s of real time)
await shot('04-after-coolroom', { x: -69.2, z: 0.2, a: Math.PI + 0.3 });
await shot('05-after-roof', { roof: true });
const b4 = await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero; const hp = h.hp; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); return { r: r.r, label: r.target?.label, healed: h.hp > hp }; });
check('the jars at the door are cold: a drink there restores life (INPUT)', b4.label === 'p_drink' && b4.healed, { b4, hp0 });
const b5 = await ev(() => { const f = game.flags, h = game.hero; const c0 = h.coins; P.talk('dtrader'); const owed = f.k_owe || 0; P.wait(1.5); P.settle();
  for (let k = 0; k < 3; k++) for (const p of [...game.pickups.list]) if (p.type === 'coin' && p.owe === 'k_owe') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 });
  P.settle(); return { paid: !!f.k_paid, owed, coins: h.coins - c0, oweAfter: f.k_owe || 0, journal: game.story.journal().find((j) => j.title === 'Kesh')?.lines }; });
const b5l = await said();
check('Brosk pays five kashes (one coin, owed until picked up, then his; INPUT); the journal closes', b5.paid && b5.owed === 1 && b5.coins === 5 && b5.oweAfter === 0 && b5.journal?.every((l) => l.done) && b5l.some((l) => /five kashes/.test(l)), { b5, b5l });
const b6 = await ev(() => { const out = []; for (const id of ['dtrader', 'weaver', 'dkid']) { P.talk(id); } return out; });
const b6l = await said();
check('afterwards Brosk, Lumi and Sani each have a line about the cool room', b6l.some((l) => /queue for cold water|keeps the dates cool/.test(l)) && b6l.some((l) => /dyes set better|Mind the threads/.test(l)) && b6l.some((l) => /guarding it|Now it's ours/.test(l)), b6l);
const tarra = await ev(() => { const r = P.talk('tarra'); return { r: r.r, task: !!game.flags.c4_pumpTask }; });
const tarral = await said();
check('Mother Tarra\'s lines stay chapter 4\'s own (the main story first)', tarra.r === 'talked' && tarral.some((l) => /forgotten that sound|swimming/.test(l)), { tarra, tarral });

// ---- order B (a fresh flag set, the pump running): Lumi first, fit, then turn; a save before the coin is picked up
iso('order B: the k_ flags cleared (a fresh story), the cowl back to its storm position');
await ev(() => { const f = game.flags; for (const k of Object.keys(f)) if (k.startsWith('k_')) delete f[k]; game.story.applyFlags(); game.step(0.5); });
const c1 = await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags;
  const sani = P.npc('dkid'), K = game.rooms.desert;
  const back = { dir: C.dir, sani: +Math.hypot(sani.pos.x - K.npcSpots.kid.x, sani.pos.z - K.npcSpots.kid.z).toFixed(2) };
  P.talk('weaver'); const screen = !!f.k_screen;
  P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(1); const fit = !!f.k_fit, d0 = f.k_dir ?? 2;
  return { back, screen, fit, d0 }; });
const c1f = await said();
check('other order: Lumi\'s screen first, fitted on the roof while the mouth still faces away (INPUT)', c1.back.dir === 2 && c1.back.sani < 0.3 && c1.screen && c1.fit && c1.d0 === 2 && c1f.some((l) => /Now the mouth goes into the wind/.test(l)), { c1, c1f });
// Save & quit → Continue with the screen fitted but the mouth still facing away
file = path.join(os.tmpdir(), 'desertlife-fit-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
const c1s = await ev(() => { P.settle(); const f = game.flags, C = game.rooms.desert.kesh.cool, K = game.rooms.desert.kesh;
  return { room: game.room?.id, fit: !!f.k_fit, dir: f.k_dir ?? 2, cowl: C.dir, screen: !!f.k_screen, done: !!f.k_done, items: game.story.items().map((i) => i.id), journal: game.story.journal().find((j) => j.title === 'Kesh')?.lines }; });
check('Save & quit → Continue with the screen fitted, not yet turned: the screen stays on, the cowl still faces east, nothing to carry; the journal ticks the screen', c1s.room === 'desert' && c1s.fit && c1s.screen && !c1s.done && c1s.dir === 2 && c1s.cowl === 2 && !c1s.items.includes('kscreen') && c1s.journal?.some((l) => l.key === 'k_j_screen' && l.done) && c1s.journal?.some((l) => l.key === 'k_j_cool' && !l.done), c1s);
const c1d = await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); P.settle(); const lumi = P.talk('weaver'); return { r: r.r, lumi: lumi.r }; });
const c1dl = await said();
check('…after Continue the door says the screen is on but the mouth still faces the wrong way; Lumi says turn it into the wind (INPUT)', c1d.r === 'used' && c1dl.some((l) => /screen is on up there, but the mouth still faces the wrong way/.test(l)) && c1dl.some((l) => /Now turn it into the wind/.test(l)), { c1d, c1dl });
const c1t = await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags;
  const labels = [];
  for (let i = 0; i < 5 && !f.k_done; i++) { P.wait(0.8); const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); labels.push(r.target?.label); }
  return { labels, turns: f.k_turns, done: !!f.k_done, sand: !!f.k_sand }; });
const c1l = await said();
check('…then two turns (after Continue): the room draws, no sand (INPUT)', c1t.turns === 2 && c1t.done && !c1t.sand && c1l.some((l) => /Side-on/.test(l)) && c1l.some((l) => /curtain in the door lifts/.test(l)), { c1t, c1l });
const c2 = await ev(() => { const f = game.flags, h = game.hero; const c0 = h.coins; P.talk('dtrader'); return { c0, owed: f.k_owe || 0, lying: game.pickups.list.filter((p) => p.owe === 'k_owe').length }; });
await said();
file = path.join(os.tmpdir(), 'desertlife2-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue');
const c3 = await ev(() => { const t = (game.hud.toastLog || []).slice(); P.settle(); const C = game.rooms.desert.kesh.cool, f = game.flags; return { coins: game.hero.coins, owed: f.k_owe || 0, t, dir: C.dir, done: !!f.k_done, sani: P.npc('dkid').forceAnim }; });
await said();
check('saved before he picked Brosk\'s coin up: on Continue the five kashes are his (a toast says so); the room still draws', c2.owed === 1 && c2.lying === 1 && c3.coins === c2.c0 + 5 && c3.owed === 0 && c3.t.some((s) => /Brosk's payment/.test(s)) && c3.dir === 0 && c3.done && c3.sani === 'kneelWork', { c2, c3 });

// ---- chapter 5: Brosk's chapter errand comes first; lines follow the steam and the vent
iso('chapter 5 by flags (c4_done → nextChapter, as tests/chapter5.mjs), the k_ flags cleared again');
await ev(() => { const G = game, f = G.flags; for (const k of Object.keys(f)) if (k.startsWith('k_')) delete f[k]; Object.assign(f, { c4_digOpen: true, c4_notebook: true, c4_seals3: true, c4_carving: true, c4_done: true }); G.story.nextChapter(); P.settle(); G.step(1); P.settle(); });
await said();
const e1 = await ev(() => { const f = game.flags; P.talk('dtrader'); const jar = !!f.c5_jar, ask = !!f.k_ask; return { ch: f.chapterKey, jar, ask }; });
const e1l = await said();
check('chapter 5: talking to Brosk gives his jar for the shovel trade (the chapter\'s errand first, not the cool room)', e1.ch === 'steam' && e1.jar && !e1.ask && e1l.some((l) => /Fill this jar/.test(l)), { e1, e1l });
iso('chapter 5: the jar filled and the shovel traded by flags (c5_water, c5_shovel; tests/chapter5.mjs plays them)');
await ev(() => { Object.assign(game.flags, { c5_water: true, c5_shovel: true }); });
const e2 = await ev(() => { P.talk('dtrader'); return { ask: !!game.flags.k_ask }; });
const e2l = await said();
check('…then Brosk tells of the cool room in chapter 5\'s words (the steam could boil the oasis)', e2.ask && e2l.some((l) => /steam boils the oasis/.test(l)), { e2, e2l });
const e3 = await ev(() => { const r = P.talk('weaver'); return { r: r.r, screen: !!game.flags.k_screen }; });
const e3l = await said();
check('in chapter 5 Lumi hands over the screen straight away (Kesh trusts him since the pump)', e3.screen && e3l.some((l) => /I wove a new one/.test(l)), { e3, e3l });
await shot('06-board-ferry-chalked', { x: -27.5, z: 12.4, a: 1.14 });
iso('chapter 5: the vent opened by flags (c5_routed, c5_dallanOK, c5_relief, c5_vent)');
await ev(() => { const G = game; Object.assign(G.flags, { c5_dug: true, c5_routed: true, c5_dallanOK: true, c5_relief: true, c5_vent: true }); G.story.applyFlags(); P.settle(); });
await said();
const e4 = await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); for (let i = 0; i < 5 && !f.k_done; i++) { P.wait(0.8); P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); } P.talk('dtrader'); P.wait(1); P.settle(); P.talk('dtrader'); P.talk('weaver'); return { done: !!f.k_done, paid: !!f.k_paid, trace: P.trace.slice(-14) }; });
const e4l = await said();
check('after the vent: done the same way; Brosk and Lumi speak of the quiet since the vent and Dallan at the cool room', e4.done && e4.paid && e4l.some((l) => /Dallan came in/.test(l)) && e4l.some((l) => /since the vent/.test(l)), { e4, e4l });
const board = await ev(() => ({ taken: !!game.flags.c5_ferryTaken, ferry: game.story.kesh._ferry }));
check('the yacht stop board: the ferry chalked out once the project took it', board.taken && board.ferry === false, board);
await shot('07-loom-sail', { x: -61.5, z: 3.0, a: Math.PI * 0.75 });
await shot('08-poles-drift', { x: -2, z: 11, a: Math.PI / 2 + 0.15 });
await shot('09-screens', { x: -62, z: -14, a: -Math.PI / 2 - 0.5 });

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
