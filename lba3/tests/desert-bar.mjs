// DESERT-BAR (8.11.2026; docs/lba-maturity/desert-inventory.md): Desert Island at Citadel's bar, played by input where
// it says INPUT (walking with the harness's arrow keys, E; tests/lib/player.js), through the story's states:
//   - chapter 4: the island's boards and signs read (KESH, the post's gate, Ilka's survey board, the School's
//     signpost, Hesk's stop); the oasis dry; Kesh's homes have their people (Dela in Brosk's house) and they talk in
//     Kesh's state; S28's board beside its door, the door into the crew's bunkhouse with Brann; the dormitory knocked on
//     while dark; the post's bunk cabin shut while a sandstorm blows (the guard inside) and open after it;
//   - the pump running: a drink at the oasis gives back life; the dormitory leads in once the pupils' crystal is awake
//     (Joss), the School's signpost thanks him;
//   - chapter 5 with the ferry taken: Hesk's stop and the post's gate say so; Brann gone with the crew;
//   - chapter 6: Tarra, Ilka, Dallan and Doran have their own lines (not "Hello, Twinsen."); the Temple of Bù and the
//     condenser hall stay open after their chapters (in, the carving and the diagram read, the hangar's glider gone,
//     out again facing away); a save in the dormitory comes back there; a death on the island → Retry → the last save,
//     full health;
//   - chapter 8 (Citadel's evacuation): Kesh's walkers and the School's people are still on Desert Island, with their
//     own lines; chapter 10 and the epilogue: the boards' and the keepers' lines move on.
// ISO (logged): the chapters are set by their flags (as tests/world-consistency.mjs); he is put a few metres before
// each door or board, and walks the rest. SwiftShader: no pictures judged here (SHOTS=dir writes a few).
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
let { browser, context, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
// the page's helpers: a chapter by its flags; a read or a door by input from a few metres off
const helpers = () => ev(async () => {
  const RG = await import('/src/game/regions.js');
  window.BASE ??= JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    for (const id of [...(RG.CHAPTER_AREAS[key] || []), 'desert']) G.regions.ensure(id, 'test');
    if (G.room?.id !== 'desert') G.enterRoom('desert', G.rooms.desert.dock, true, true);
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
  // (ISO) Twinsen d metres before a point, facing it (from the side `from` points to), on the ground
  window.before = (x, z, fx, fz, d = 2.4) => { const G = game, h = G.hero, l = Math.hypot(fx, fz) || 1; const sx = x + fx / l * d, sz = z + fz / l * d; h.pos.set(sx, G.physics.groundAt(sx, sz, h.pos.y + 6), sz); h.angle = Math.atan2(x - sx, z - sz); h.onGround = true; h.vy = 0; G.camRig.snap(); G.step(0.3); P.settle(); };
  // a desert read (story/desertlife.js things) by input: walk up and press E
  // (from 2 m toward Kesh's plaza: the land side of every board, away from the pond, the sea and the fences)
  window.readIt = (id) => { const G = game, T = G.story.dlife.things().find((q) => (q.id || q.kind) === id); if (!T) return { r: 'none' }; const pl = G.rooms.desert.plaza; before(T.x, T.z, pl.x - T.x, pl.z - T.z, 2.0); const u = P.use(T.x, T.z, { kind: T.kind, near: 0.8 }); P.settle(); return { r: u.r, kind: u.target?.kind }; };
  // into a room through its door by input: from 2.6 m before the door's sill (or a given spot), the room's id after
  window.walkIn = (rid, from = null) => { const G = game, d = G.story.doors().find((q) => q.room === rid); if (!d) return { r: 'no door' };
    const sd = G.room?.shutDoors?.find((q) => q.id === d.house);
    if (from) before(d.x, d.z, from[0] - d.x, from[1] - d.z, Math.hypot(from[0] - d.x, from[1] - d.z));
    else if (sd?.sill) { const a = sd.ry ?? 0; before(d.x, d.z, Math.sin(a), Math.cos(a), 2.2); }
    const t = P.through(d.x, d.z); return { r: t.r, room: G.room?.id }; };
  window.walkOut = () => { const G = game, e = G.room?.exits?.find((x) => /-out$/.test(x.to)) || G.room?.exits?.[0]; if (!e) return { r: 'no exit' }; const t = P.through(e.x, e.z); const h = G.hero.pos; return { to: G.room?.id, at: [h.x, h.z], ground: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15 }; };
  window.talkTo = (id) => { const r = P.talk(id); return r.r; };
});

await open(page, '?nocine'); await menu(page, 'new');
await helpers();
iso('chapter 4 by its flags (as tests/world-consistency.mjs); on Desert Island at the pier');
await ev(() => setChapter('dig', { c4_started: true }));
await said();

// ---------------------------------------------------------------- chapter 4, the pump seized
const reads = {};
for (const [id, re] of [['kesh', /KESH/], ['post', /AUTHORISED STAFF ONLY/], ['survey', /warm ground/], ['school', /KNOCK LOUDLY/], ['board', /ASK HESK/], ['dl_oasis', /ring of mud/]]) {
  const r = await ev((id) => readIt(id), id); const s = await said();
  reads[id] = { ...r, ok: r.r === 'used' && has(s, re), line: s[0] };
}
check('chapter 4: the island\'s boards and signs are read, each its own line (INPUT): the pier, the post\'s gate, Ilka\'s survey board (warm ground), the School\'s signpost, Hesk\'s stop; the oasis is mud', Object.values(reads).every((r) => r.ok), reads);
await shot('desert-bar-01-reads');
const dela = await ev(() => { const w = walkIn('ih_kesh_house0'); const n = P.npc('ih_dela'); const t = talkTo('ih_dela'); return { ...w, present: !!n?.present, t }; });
const delaL = await said();
const delaO = await ev(() => walkOut());
check('Brosk\'s house (INPUT: in by its door, talk, out): Dela at her jars, a line of the seized pump\'s state; out on the island', dela.room === 'ih_kesh_house0' && dela.present && dela.t === 'talked' && has(delaL, /pay in water/) && delaO.to === 'desert' && delaO.ground, { dela, delaL, delaO });
const s28 = await ev(() => { const G = game, B = G.rooms.desert.s28board; before(B.x, B.z, -1, 0, 2.5); const u = P.use(B.x, B.z, { kind: 'pp_door', near: 0.8 }); P.settle(); return { u: u.r, room: G.room?.id, survey: !!G.flags.pp_survey }; });
const s28L = await said();
const s28in = await ev(() => { const w = walkIn('ih_s28'); const t = talkTo('ih_brann'); return { ...w, t }; });
const s28inL = await said();
const s28out = await ev(() => walkOut());
check('S28 (INPUT): the crew\'s board beside the door is read where it hangs (Anko\'s sketch, not indoors); the door leads into the bunkhouse, Brann talks (the crew works here); back out', s28.room === 'desert' && s28.survey && s28in.room === 'ih_s28' && s28in.t === 'talked' && has(s28inL, /shift/) && s28out.to === 'desert', { s28, s28in, s28inL, s28out });
const hall0 = await ev(() => { const G = game, O = G.rooms.desert.oldHomes; before(O.hall.x, O.hall.z, 0, -1, 2.0); const u = P.use(O.hall.x, O.hall.z, { kind: 'pp_door', near: 0.8 }); P.settle(); return { u: u.r, door: G.story.doors().some((d) => d.room === 'ih_hall'), room: G.room?.id }; });
const hall0L = await said();
check('the School\'s dormitory while its crystal sleeps (INPUT): knocked on, pupils inside who can\'t see; no way in', hall0.u === 'used' && !hall0.door && hall0.room === 'desert' && has(hall0L, /can't see/), { hall0, hall0L });
iso('Ilka\'s errand given by flag (c4_ilka: the storms blow while the notebook is wanted); a sandstorm waited for (game time)');
const storm = await ev(() => { const G = game, cur = G.story.cur, D = G.rooms.desert; G.flags.c4_ilka = true; let n = 0; for (; n < 600 && !cur.stormy; n++) G.step(0.25); if (!cur.stormy) return { stormy0: false, waited: n * 0.25 };
  const sd = D.shutDoors.find((x) => x.id === 'post-cabin1'); before(sd.x, sd.z, Math.sin(sd.ry), Math.cos(sd.ry), 2.0);
  const door = G.story.doors().some((d) => d.room === 'ih_post_cabin1'); const u = P.use(sd.x, sd.z, { kind: 'ihshut', near: 0.8 }); P.settle();
  const room = G.room?.id, pl = D.plaza; before(pl.x, pl.z, 3, 3, 3);   // (ISO: back to Kesh's plaza, out of the post's yard, before the drones can see again)
  let t = 0; while (cur.stormy && t < 120) { G.step(0.5); t += 0.5; }
  const after = G.story.doors().some((d) => d.room === 'ih_post_cabin1'); delete G.flags.c4_ilka; G.step(0.3);
  return { stormy0: true, door, u: u.r, room, after }; });
const stormL = await said();
check('the post\'s bunk cabin while a sandstorm blows (INPUT): shut, the guard waiting it out inside (its own line); a door again once the storm passes', storm.u === 'used' && !storm.door && storm.room === 'desert' && has(stormL, /gate guard/) && storm.after, { storm, stormL });
const safi4 = await ev(() => talkTo('safi')); const safi4L = await said();
check('Safi on her round (INPUT): her first line is the seized pump\'s', safi4 === 'talked' && has(safi4L, /carry from the mud/), { safi4, safi4L });

// ---------------------------------------------------------------- the pump running, the pupils' crystal awake
iso('the pump\'s three gears and Tarra\'s trust set by flags (tests/chapter4.mjs plays them); the pupils\' crystal woken by flag (tests/purposes.mjs plays the fork)');
await ev(() => { const G = game; Object.assign(G.flags, { c4_pumpTask: true, c4_gear0: true, c4_gear1: true, c4_gear2: true, c4_pump: true, c4_trust: true, pp_lamp: true, pp_oniAsk: true }); G.story.applyFlags(); G.step(1); P.settle(); });
const drink = await ev(() => { const G = game, h = G.hero; h.hp = Math.max(1, h.maxHp - 4); const hp0 = h.hp; G.story.dlife._drank = -99; const r = readIt('dl_oasis'); return { ...r, hp0, hp: h.hp }; });
const drinkL = await said();
check('the oasis with the pump running (INPUT): a drink, a little life back', drink.r === 'used' && drink.hp > drink.hp0 && has(drinkL, /Kesh earned it/), { drink, drinkL });
const dorm = await ev(() => { const w = walkIn('ih_hall'); const t = talkTo('ih_joss'); return { ...w, t }; });
const dormL = await said();
await shot('desert-bar-02-dormitory');
const dormO = await ev(() => walkOut());
const sign = await ev(() => readIt('school')); const signL = await said();
check('the crystal awake: the dormitory leads in (INPUT), Joss reads again; out on the rim walk; the School\'s signpost thanks him', dorm.room === 'ih_hall' && dorm.t === 'talked' && has(dormL, /read again/) && dormO.to === 'desert' && dormO.ground && sign.r === 'used' && has(signL, /Thank you, Twinsen/), { dorm, dormL, dormO, signL });

// ---------------------------------------------------------------- chapter 5, the ferry requisitioned
await ev(() => setChapter('steam', { c4_pump: true, c4_trust: true, c4_digOpen: true, c4_seals3: true, c5_planned: true, c5_ferryTaken: true }));
await said();
const r5 = {};
for (const [id, re] of [['board', /NO FERRY/], ['post', /FERRY REQUISITIONED/]]) { const r = await ev((id) => readIt(id), id); const s = await said(); r5[id] = { ...r, ok: r.r === 'used' && has(s, re), line: s[0] }; }
const brann5 = await ev(() => { const w = walkIn('ih_s28'); const n = P.npc('ih_brann'); const o = walkOut(); return { ...w, present: !!n?.present, out: o.to }; });
check('chapter 5, the ferry taken: Hesk\'s stop and the post\'s gate say so (INPUT); the bunkhouse is empty, its sleeper gone with the crew', Object.values(r5).every((r) => r.ok) && brann5.room === 'ih_s28' && !brann5.present && brann5.out === 'desert', { r5, brann5 });

// ---------------------------------------------------------------- chapter 6: between chapters; the places the story opened
const C6 = { c4_pump: true, c4_trust: true, c4_digOpen: true, c4_seals3: true, c4_carving: true, c5_planned: true, c5_dug: true, c5_routed: true, c5_hatch: true, c5_vent: true, c5_done: true, pp_lamp: true, c6_started: true };
await ev((C6) => setChapter('pass', C6), C6);
await said();
const idle = {};
for (const id of ['tarra', 'ilka', 'dallan', 'doran']) { const r = await ev((id) => talkTo(id), id); const s = await said(); idle[id] = { r, line: s[0] }; }
check('chapter 6 on Desert Island: Tarra, Ilka, Dallan and Doran each have a line of the story so far (INPUT), not "Hello, Twinsen."', Object.values(idle).every((x) => x.r === 'talked' && x.line && !/^Hello, Twinsen\.?$/.test(x.line)), idle);
const temple = await ev(() => { const G = game, D = G.rooms.desert, dg = D.dig; const w = walkIn('butemple', [dg.x, dg.z]); const C = G.room?.carving; let u = null; if (C) { u = P.use(C.x, C.z, { kind: 'dl_read', near: 1.2 }).r; P.settle(); } const o = walkOut(); return { ...w, u, out: o.to }; });
const templeL = await said();
check('the Temple of Bù stays open after chapter 4 (INPUT: in from the dig\'s floor, the carving read again with Ilka\'s chalk, out)', temple.room === 'butemple' && temple.u === 'used' && has(templeL, /second tick/) && temple.out === 'desert', { temple, templeL });
const hall = await ev(() => { const G = game, D = G.rooms.desert; const w = walkIn('condA', [D.ruins.stand.x, D.ruins.stand.z]); const A = G.room; let u = null; if (A?.diagram) { u = P.use(A.diagram.x, A.diagram.z, { kind: 'dl_read', near: 1.0 }).r; P.settle(); }
  const toB = P.exitTo('cond-b'); const B = G.room; let gone = null;
  if (B?.id === 'condB') { const gl = []; B.group.traverse((m) => { if (m.isMesh && m.parent?.parent === B.group && m.parent.visible === false) gl.push(1); }); gone = { hiddenParts: gl.length, colliders: B.colliders.filter((c) => c.enabled === false).length }; }
  const back = P.exitTo('cond-a'); const o = walkOut(); return { ...w, u, toB: toB.to, gone, back: back.to, out: o.to }; });
const hallL = await said();
check('FunFrock\'s condenser hall stays open after chapter 5 (INPUT: in by the dug-out door, the diagram read with Ilka\'s note, the hangar with the glider gone, out)', hall.room === 'condA' && hall.u === 'used' && has(hallL, /Works\. Don't touch/) && hall.toB === 'condB' && hall.gone?.colliders >= 3 && hall.out === 'desert', { hall, hallL });
// a save in the dormitory comes back there
const sv = await ev(() => { const w = walkIn('ih_hall'); game.save(false); return w; });
const file = path.join(os.tmpdir(), 'desert-bar-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await browser.close();
({ browser, context, page } = await launch({ storageState: file }));
await open(page, '?nocine'); await menu(page, 'continue'); await helpers(); await said();
const back = await ev(() => { const G = game, h = G.hero.pos; P.settle(); const r = { room: G.room?.id, floor: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15, joss: !!P.npc('ih_joss')?.present }; const o = walkOut(); return { ...r, out: o.to, state: G.state }; });
check('Save in the dormitory → Continue: back in it, on its floor, Joss there; its door leads out onto the island', sv.room === 'ih_hall' && back.room === 'ih_hall' && back.floor && back.joss && back.out === 'desert' && back.state === 'play', { sv, back });
// a death on the island: Retry → the last save, full health
const dead = await ev(() => { const G = game, h = G.hero; G.save(false); h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(5, null); for (let i = 0; i < 200 && G.state !== 'gameover'; i++) G.step(1 / 30); return { state: G.state, at: [h.pos.x, h.pos.z] }; });
const reloaded = page.waitForEvent('load', { timeout: 300000 });
await page.click('#gameover [data-act="retry"]', { timeout: 60000 });
await reloaded;
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
await page.addScriptTag({ path: path.join(path.dirname(new URL(import.meta.url).pathname), 'lib/player.js') });
await ev(() => { game.testFreeze = true; game.step(0.3); P.settle(); });
await helpers(); await said();
const retry = await ev(() => { const G = game, h = G.hero; return { room: G.room?.id, hp: h.hp, max: h.maxHp, state: G.state, ch: G.flags.chapterKey }; });
check('a death on Desert Island → Retry: back at the last save on the island, full health, chapter 6 still', dead.state === 'gameover' && retry.room === 'desert' && retry.hp === retry.max && retry.state === 'play' && retry.ch === 'pass', { dead, retry });
fs.rmSync(file, { force: true });

// ---------------------------------------------------------------- chapter 8 (Citadel's evacuation), 10, the epilogue
await ev((C6) => setChapter('evacuation', { ...C6, c8_started: true }), C6);
await said();
const ev8 = await ev(() => { const here = (id) => !!P.npc(id)?.present; return { kesh: ['safi', 'tamu', 'bashir'].map(here), school: ['sc_master', 'sc_pupa', 'oni'].map(here), safi: talkTo('safi') }; });
const ev8L = await said();
const jorr = await ev(() => { const w = walkIn('ih_kesh_house2'); const t = talkTo('ih_jorr'); const o = walkOut(); return { ...w, t, out: o.to }; });
const jorrL = await said();
check('chapter 8, Citadel evacuating: Kesh\'s walkers and the School\'s people are still on Desert Island; Safi and Jorr talk of Citadel\'s news (INPUT)', ev8.kesh.every(Boolean) && ev8.school.every(Boolean) && ev8.safi === 'talked' && has(ev8L, /Citadel/) && jorr.room === 'ih_kesh_house2' && jorr.t === 'talked' && has(jorrL, /Citadel/), { ev8, ev8L, jorr, jorrL });
await ev((C6) => setChapter('network', { ...C6, c10_started: true, c10_pulse: true }), C6);
await said();
const n10 = await ev(() => readIt('post')); const n10L = await said();
const hanna = await ev(() => { const w = walkIn('ih_kesh_house4'); const t = talkTo('ih_hanna'); walkOut(); return { ...w, t }; }); const hannaL = await said();
check('chapter 10: the post\'s gate is the relay station; Old Hanna talks of Hesk flying everyone everywhere (INPUT)', n10.r === 'used' && has(n10L, /RELAY STATION/) && hanna.t === 'talked' && has(hannaL, /flying everyone/), { n10L, hanna, hannaL });
await ev((C6) => setChapter('home', { ...C6, ep_dinner: true, ep_free: true }), C6);
await said();
const ep = await ev(() => readIt('board')); const epL = await said();
const epT = await ev(() => talkTo('tamu')); const epTL = await said();
check('the epilogue: Hesk\'s stop has a child\'s line on it; Tamu missed the party (INPUT)', ep.r === 'used' && has(epL, /TAMU WAS FIRST/) && epT === 'talked' && has(epTL, /party/), { epL, epTL });

done();
await browser.close();
