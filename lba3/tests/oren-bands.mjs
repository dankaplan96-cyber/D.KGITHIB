// NW-1 "Bands" (docs/future/EXPANSION_PLAN.md §4.4 NW-1, Revision R1.11 "As built"): chapter 14 of the expanded campaign
// ('network', story/bands.js), the bands at the valve room, the lighthouse, the bore and the dome. Every station's own
// task and every band is played by input (tests/lib/player.js: keys, the game's own time step, A* over its collision,
// the station's people standing where the chapter puts them: the people-aware reach check of every band spot):
//   chapter 13's end → chapter 14: Baldino's briefing gains vm_3 (Vesk's drill hasn't missed a stroke) and the floats →
//   the spaceship to Citadel → the lighthouse first (another order than segment 13's): Zoé, the dials; the relay comes
//   on with Baldino's LOW, Arthur reads the needle ("set too low"), nobody else on the line yet (no radio) → MID (still
//   low), HIGH right → the haze: Zoé puts the fog call out, the needle sags → Save → Continue mid-task → LOW (wrong),
//   MID right: Arthur asks to mind the band, "Station ready" (1/5) → the way down the stairs → the valve room: Mira, the
//   three wheels; the relay comes on at HIGH, the needles sag, the lighthouse complains by radio → LOW (wrong: past
//   green), MID right → Oren trims the relay's share on a stroke, the needles sag → HIGH (wrong), LOW right: Mira's
//   job, Baldino learns Oren rations the mains (2/5) → Save → Continue after → the mill by its flags (ISO: OG-6's own
//   route is tests/oren-coils.mjs; NW-1 counts it done at og6_band >= 2) → the glider to the Hamalayi: Yorna, Pim, the
//   dome's relay and telescope; the band (HIGH right, a cloud, LOW right) → the glider to Desert Island: Ilka, the
//   bore's relay; the fight (ISO assist: the fight is chapter10's and segment 13's); the band (MID set by its flag and
//   saved before the reading: Save → Continue reads it on arrival; the vent surges, HIGH right): all five → the glider to Citadel, Baldino's code box → chapter 15.
// Also: an older save that finished a station the old way keeps
// it (no float, no band), the base campaign (exp_base) never showing any of it, and the draw cost in the valve room.
// Times are the bot's game time (a floor, not a first-time estimate). SwiftShader: draw counts only, never fps.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const bandTime = {};
const timed = async (s, f, a) => { const t0 = await ev(() => game.time); const r = await ev(f, a); bandTime[s] = (bandTime[s] || 0) + (await ev(() => game.time)) - t0; return r; };

const UP_TO_NETWORK = { prologueDone: true, intro: true, c1_started: true, c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
  c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_home: true, c8_gilbert: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_pippa: true, c8_zoeDone: true, c8_done: true,
  c9_started: true, c9_heard: true, c9_vote: true, ml_2: true, ml_3: true,
  og_started: true, og_home: true, og_arrived: true, og_room: true, og_bleed: 3, og_steady: true, og_thanks: true, og_done: true,
  og2_started: true, og2_met: true, og2_bramAsk: true, og2_bram: true, og2_umeAsk: true, og2_ume: true, og2_picoAsk: true, og2_bell: true, og2_pico: true, og2_open: true, og2_asked: true, og2_done: true };
const MILL_DONE = { c10_okuAsk: true, c10_millBraked: true, og6_brief: true, og6_out: true, og6_plan: true, og6_beat: true, og6_bolt: 3, og6_coilOut: true, og6_fitted: true, og6_relay: true, og6_dial: 1, og6_band: 2, og6_lull: true, c10_mill: true };

const helpers = () => ev(() => {
  const G = game;
  window.__said = []; const say0 = G.say.bind(G);
  G.say = (name, text, cb, sp, col) => { window.__said.push((name ? name + ': ' : '') + (Array.isArray(text) ? text.join(' ') : text)); return say0(name, text, cb, sp, col); };
  window.__cards = []; const H = G.hud, cc = H.chapterCard.bind(H); H.chapterCard = (a, b) => { window.__cards.push((a ? a + ' · ' : '') + b); return cc(a, b); };
  const net = () => G.story.chapters.find((c) => c.key === 'network');
  window.T = {
    net, nw: () => net().nw1,
    obj: () => document.querySelector('#pause-objective')?.textContent || '',
    at: (id) => { const n = G.npcs.find((x) => x.def.id === id); return n?.present ? { x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2) } : null; },
    st: (s) => { const f = G.flags, B = net().nw1, F = B.floats[s]; return { lit: !!f['c10_lit_' + s], at: f['c10_bandAt_' + s] ?? null, band: f['c10_band_' + s] | 0, shift: !!f['c10_shift_' + s], done: !!f['c10_' + s], state: B.state(s), float: F ? F.g.visible : null, lamp: F ? (F.lamp.material.emissive?.getHexString?.() ?? '') : null }; },
    view: () => {
      const f = G.flags;
      return { key: f.chapterKey, room: G.room?.id ?? 'citadel', state: G.state, vm3: !!f.vm_3, stations: net().done(), valves: T.st('valves'), light: T.st('light'), bore: T.st('bore'), dome: T.st('dome'),
        obj: T.obj(), journal: G.story.journal().find((c) => /Network/.test(c.title))?.lines?.map((l) => l.key) || [] };
    },
    // one notch of a station's band, by input (walk to the relay's float past whoever stands there, E), then the reading
    turn(s) {
      const f = G.flags, p = net().nw1.spot(s), n0 = window.__said.length;
      const r = P.use(p.x, p.z, { near: 0.8, kind: 'nw1band' });
      for (let i = 0; i < 25; i++) G.step(0.1); P.settle();
      return { r: r.r, kind: r.target?.kind, at: f['c10_bandAt_' + s], band: f['c10_band_' + s] | 0, shift: !!f['c10_shift_' + s], done: !!f['c10_' + s], said: window.__said.slice(n0) };
    },
    // wait at the station for its change of conditions (the game's own clock)
    shift(s) { const f = G.flags, n0 = window.__said.length; let t = 0; for (; t < 15 && !f['c10_shift_' + s]; t += 0.1) G.step(0.1); P.settle(); for (let i = 0; i < 10; i++) G.step(0.1); P.settle(); return { t: +t.toFixed(1), shift: !!f['c10_shift_' + s], ...T.st(s), said: window.__said.slice(n0) }; },
    draws() { const R = G.renderer.renderer; let main = 0, shadow = 0; const o = R.renderBufferDirect.bind(R); R.renderBufferDirect = (cam, scene, ...a) => { if (scene) main++; else shadow++; return o(cam, scene, ...a); }; G.perf.beginFrame(); G.frame(1 / 30, true); R.renderBufferDirect = o; return { main, shadow }; },
  };
});
const reload = async () => { await open(page, '?nocine'); await helpers(); await page.click('#btn-continue'); await ev(() => { game.step(0.05); P.settle(); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); }); };
const said = (lines, re) => lines.some((l) => re.test(l));
const saveWith = (F, extra, room, x, z) => ev(([F, E, room, x, z]) => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 6, at: Date.now(), room, hero: { x, z, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { exp: 1, ...F, chapter: 13, chapterKey: 'network', c10_started: true, c10_pulse: true, vm_3: true, og6_brief: true, og6_out: true, ...E }, killed: [], collected: [], searched: [], crates: [], loot: [] })); }, [F, extra, room, x, z]);

// ---------------------------------------------------------------- chapter 14 begins: Baldino's briefing
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
const s0 = await ev((F) => {
  const G = game; P.settle();
  Object.assign(G.flags, F, { chapter: 12, chapterKey: 'balances' }); G.hero.hasBall = true;
  G.story.applyFlags();
  G.story.nextChapter(); G.step(0.5); P.settle();
  return { ...T.view(), said: window.__said.slice() };
}, UP_TO_NETWORK);
console.log('chapter 14 start:', JSON.stringify({ vm3: s0.vm3, said: s0.said.slice(0, 8), journal: s0.journal }));
check("Baldino's briefing (expanded campaign): Vesk's drill hasn't missed a stroke since the council's order (vm_3), and every relay carries a brass float whose band somebody at each station sets", s0.key === 'network' && s0.vm3 && said(s0.said, /sat on Vesk's desk for days\. His drill hasn't missed a stroke/) && said(s0.said, /every relay carries one of my brass floats now/) && s0.journal.includes('nw1_j_vm3') && s0.journal.includes('nw1_j_float'), { vm3: s0.vm3, journal: s0.journal });

// to Citadel by the spaceship (as a player)
const trip = await ev(() => { const G = game; P.exitTo(G.room.exits[0].to); P.settle(); for (let i = 0; i < 10; i++) G.step(0.1); const r = P.shipTo('zeelich_port'); P.settle(); return { r: r.room ?? r.r, room: G.room?.id ?? 'citadel' }; });
check('out of the workshop and over to Citadel by the spaceship', trip.room === 'citadel', trip);

// ---------------------------------------------------------------- the lighthouse first: Zoé, the dials, the band
const l0 = await ev(() => {
  const G = game, f = G.flags, L = () => G.rooms.lighttop;
  // (a remark of his on the way up can open first: read it, talk to her again, as a player would)
  let z; for (let k = 0; k < 3 && !f.c10_zoeAsk; k++) { z = P.talk('zoe', { run: true }); P.settle(); }
  for (let pass = 0; pass < 3 && !f.c10_lit_light; pass++) for (const i of [1, 2, 3]) { if (f.c10_lit_light) break; const s = L().searches.find((x) => x.id === 'dial' + i); P.use(s.x, s.z, { near: 0.8 }); P.settle(); }
  for (let i = 0; i < 10; i++) G.step(0.1); P.settle();
  return { z: z.r, ask: !!f.c10_zoeAsk, room: G.room?.id, ...T.view(), zoe: T.at('zoe'), arthur: T.at('arthur'), said: window.__said.slice(-4) };
});
console.log('the lighthouse:', JSON.stringify(l0));
check("the lighthouse's own task as before (Zoé, the three dials by input); then the relay comes on with its float at LOW: Arthur, \"set too low\"; nobody else on the line yet (no radio)", l0.ask && l0.room === 'lighttop' && l0.light.lit && !l0.light.done && l0.light.at === 0 && l0.light.float && said(l0.said, /It's still! It's sitting completely still!/) && said(l0.said, /banging on the pin! The relay's band is set too low/) && !said(l0.said, /radio: /) && l0.stations === 0, { light: l0.light, said: l0.said });
check("a wrong band lights the float's lamp amber; the objective names the band and who reads it; Zoé and Arthur stand where the chapter puts them", /e0a648/.test(l0.light.lamp) && /lighthouse relay's band \(Arthur reads the needle\)/.test(l0.obj) && !!l0.zoe && !!l0.arthur, { lamp: l0.light.lamp, obj: l0.obj });
const l1 = await timed('light', () => { const a = T.turn('light'), b = T.turn('light'); return { a, b, ...T.view() }; });
console.log('light, two notches:', JSON.stringify({ a: l1.a, b: l1.b }));
check('the band by input, past Zoé and Arthur (the people-aware reach check of the lamp room): MID is still too low; HIGH is right ("It\'s still!"), the lamp green', l1.a.kind === 'nw1band' && l1.a.at === 1 && said(l1.a.said, /set too low/) && l1.b.kind === 'nw1band' && l1.b.at === 2 && l1.b.band === 1 && said(l1.b.said, /Right in the middle/) && /5ab858/.test(l1.light.lamp), { a: l1.a, b: l1.b });
const l2 = await timed('light', () => T.shift('light'));
console.log('the haze:', JSON.stringify(l2));
check("the conditions change: haze; Zoé decides to put the fog call out to the boats (it takes some of the set's power); the needle sags, the band now set too high", l2.shift && l2.t >= 5 && said(l2.said, /Haze coming in off the sea/) && said(l2.said, /fog call out on the harbour channel/) && said(l2.said, /The boats first/) && said(l2.said, /sagging, Dad\. The band's set too high/) && l2.state === 'high', l2);

// Save → Continue mid-task
await ev(() => game.save(false));
await reload();
const r1 = await ev(() => ({ ...T.view(), zoe: T.at('zoe'), arthur: T.at('arthur') }));
console.log('reload mid-band:', JSON.stringify(r1));
check('Save → Continue mid-task: in the lamp room, the float on the relay at HIGH, the haze kept (the band set too high), Zoé and Arthur in place, the objective on the band', r1.room === 'lighttop' && r1.light.lit && r1.light.at === 2 && r1.light.shift && r1.light.band === 1 && r1.light.float && !!r1.zoe && !!r1.arthur && /lighthouse relay's band/.test(r1.obj) && r1.state === 'play', r1);
const l3 = await timed('light', () => { const a = T.turn('light'), b = T.turn('light'); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { a, b, ...T.view(), said: window.__said.slice(-8) }; });
console.log('light, after the haze:', JSON.stringify({ a: l3.a, b: l3.b }));
check('a wrong band is only a retry (LOW: the needle bangs again); MID is right: Arthur asks to mind the band, Zoé lets him, "Station ready" (1/5)', l3.a.at === 0 && said(l3.a.said, /set too low/) && !l3.a.done && l3.b.at === 1 && l3.light.done && l3.light.band === 2 && l3.stations === 1 && said(l3.said, /can I mind the band\?/) && said(l3.said, /He can\. I'll keep the boats/) && said(l3.said, /Station ready!/), { a: l3.a, b: l3.b, said: l3.said });
const l4 = await ev(() => { const n0 = window.__said.length; P.talk('arthur'); const ar = window.__said.slice(n0); const r = P.exitTo('outdoor-lighthouse'); P.settle(); return { ar, r: r.r, room: game.room?.id ?? 'citadel', journal: T.view().journal }; });
check("afterwards Arthur minds the band; the way down the stairs is free; the journal keeps it", said(l4.ar, /I'm minding the band, Dad/) && l4.room === 'citadel' && l4.journal.includes('nw1_j_light'), l4);

// ---------------------------------------------------------------- the valve room: Mira, the wheels, the band, Oren's trim
const v0 = await ev(() => {
  const G = game, f = G.flags;
  if (!P.npc('mira')?.present) P.enter('office', { run: true });
  const m = P.talk('mira', { run: true }); P.wait(1.5); P.settle();
  const V = G.rooms.valves;
  for (let pass = 0; pass < 3 && !f.c10_lit_valves; pass++) for (const v of V.valves) { if (f.c10_lit_valves) break; P.use(v.x, v.z, { near: 0.9 }); P.settle(); }
  for (let i = 0; i < 10; i++) G.step(0.1); P.settle();
  return { m: m.r, room: G.room?.id, levels: G.story.cur.gaugeLevels(), needles: T.nw().needles(), ...T.view(), said: window.__said.slice(-4) };
});
console.log('the valve room:', JSON.stringify(v0));
check('the valve room as before (Mira, three wheels by input, every gauge on two); the relay comes on at HIGH: the needles sag under green, Mira: "set too high"', v0.room === 'valves' && v0.levels.every((x) => x === 2) && v0.valves.lit && !v0.valves.done && v0.valves.at === 2 && v0.needles?.every((x) => x < 1.8) && said(v0.said, /sagging under green\. Your float's band is set too high/), { valves: v0.valves, needles: v0.needles, said: v0.said });
check('…and the lighthouse, already on the line, hears it: Arthur on the radio', said(v0.said, /n_arthurradio: Lighthouse here! The needle's twitching/), v0.said);
const v1 = await timed('valves', () => { const a = T.turn('valves'); const nA = T.nw().needles(); const b = T.turn('valves'); return { a, nA, b, ...T.view() }; });
check('LOW: the needles climb past green ("set too low", a retry); MID: green, all three', v1.a.at === 0 && said(v1.a.said, /climbing past green\. The band's set too low/) && v1.nA.every((x) => x > 2.2) && v1.b.at === 1 && v1.b.band === 1 && said(v1.b.said, /Green, all three/), { a: v1.a, b: v1.b, nA: v1.nA });
const v2 = await timed('valves', () => T.shift('valves'));
console.log("Oren's trim:", JSON.stringify(v2));
check("the change: on a stroke Oren trims the relay's share through the governor (\"Your box drinks. The shelters drink first.\"); Mira: nobody asked her; the needles sag again", v2.shift && said(v2.said, /governor's hum drops a note/) && said(v2.said, /n_oren: Your box drinks\. The shelters drink first/) && said(v2.said, /Nobody asked me/) && v2.state === 'high', v2);
const v3 = await timed('valves', () => { const a = T.turn('valves'), b = T.turn('valves'); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { a, b, ...T.view(), said: window.__said.slice(-6) }; });
console.log('valves, after the trim:', JSON.stringify({ a: v3.a, b: v3.b, said: v3.said }));
check("HIGH (still too high) then LOW: green again; Mira takes the job (\"he trims, and I follow\"), Baldino on the radio learns Oren rations the mains (2/5)", v3.a.at === 2 && said(v3.a.said, /set too high/) && v3.b.at === 0 && v3.valves.done && v3.stations === 2 && said(v3.said, /So he trims, and I follow\. That's my job now/) && said(v3.said, /He rations the mains\?/), { a: v3.a, b: v3.b, stations: v3.stations });

// Save → Continue after the change
await ev(() => game.save(false));
await reload();
const r2 = await ev(() => { const n0 = window.__said.length; P.talk('mira'); return { ...T.view(), said: window.__said.slice(n0), levels: game.story.cur.gaugeLevels() }; });
check('Save → Continue after the station: the valve room relay done (2/5), its float green on LOW, the gauges on two, Mira watches for his trims', r2.room === 'valves' && r2.valves.done && r2.valves.float && /5ab858/.test(r2.valves.lamp) && r2.stations === 2 && r2.levels.every((x) => x === 2) && said(r2.said, /I watch for his trims/), r2);

// the cost in the valve room: the float shown / hidden
const cost = await ev(() => { const G = game, F = T.nw().floats.valves, V = G.rooms.valves; const p = T.nw().spot('valves'); G.hero.pos.set(p.x, 0, p.z + 1.6); G.hero.angle = Math.PI; for (let i = 0; i < 10; i++) G.step(0.1); const on = T.draws(); F.g.visible = false; const off = T.draws(); T.nw().show(); let meshes = 0, lights = 0, transp = 0; F.g.traverse((o) => { if (o.isMesh) { meshes++; if (o.material.transparent) transp++; } if (o.isLight) lights++; }); return { on, off, meshes, lights, transp }; });
console.log('valve room draws (the float shown / hidden):', JSON.stringify(cost));
check('the cost of a float: five meshes, no lights, no transparency; at most 8 more draw calls (main + shadow)', cost.meshes === 5 && cost.lights === 0 && cost.transp === 0 && (cost.on.main + cost.on.shadow) - (cost.off.main + cost.off.shadow) <= 8, cost);

// ---------------------------------------------------------------- the mill (OG-6's band, by its flags), the dome
iso("the mill station set by OG-6's flags (its route is tests/oren-coils.mjs): NW-1 takes og6_band >= 2 as its band done");
const mill = await ev((M) => { const G = game; Object.assign(G.flags, M); G.story.applyFlags(); G.updateObjective(); return { done: T.nw().bandDone('mill'), stations: T.net().done() }; }, MILL_DONE);
check('the mill counts (3/5), its band done by OG-6 (og6_band >= 2)', mill.done && mill.stations === 3, mill);
const d0 = await ev(() => {
  const G = game, f = G.flags;
  P.exitTo('valves-out'); if (G.room) { const e = G.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); }
  const fly = P.flyTo(2);
  const y = P.talk('yorna', { run: true });
  const d = G.rooms.hamalayi.observatory.door;
  for (let k = 0; k < 3 && G.room?.id !== 'obsv'; k++) { P.through(d.x, d.z, { run: true }); P.settle(); }
  for (let k = 0; k < 2 && !f.c10_keeper; k++) P.talk('keeper');
  const t = G.rooms.obsv.telescope; P.use(t.x, t.z, { kind: 'c10domeRelay' }); P.wait(1); P.settle(); P.use(t.x, t.z, { kind: 'c10scope' }); P.settle();
  for (let i = 0; i < 10; i++) G.step(0.1); P.settle();
  return { fly: fly.room, y: y.r, room: G.room?.id, pim: T.at('pim'), ...T.view(), said: window.__said.slice(-5) };
});
console.log('the dome:', JSON.stringify(d0));
check("the dome as before (the glider, Yorna and Pim, Sefa, the relay, the telescope); the relay comes on at MID: Pim, \"ticking like a kettle… set too low\"; the lighthouse hears it on the radio", d0.room === 'obsv' && d0.dome.lit && d0.dome.at === 1 && !d0.dome.done && said(d0.said, /ticking like a kettle! The band's set too low/) && said(d0.said, /radio: /), { dome: d0.dome, said: d0.said });
const d1 = await timed('dome', () => { const a = T.turn('dome'); const s = T.shift('dome'); const b = T.turn('dome'); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { a, s, b, ...T.view(), said: window.__said.slice(-5) }; });
console.log('the dome band:', JSON.stringify({ a: d1.a, s: d1.s, b: d1.b }));
check('the dome band by input, past Pim: HIGH right ("glowing nice and even"); a cloud over the peak, "gone all dim… set too high"; LOW right: Pim keeps the band (4/5)', d1.a.kind === 'nw1band' && d1.a.at === 2 && d1.a.band === 1 && said(d1.a.said, /glowing nice and even/) && said(d1.s.said, /cloud slides over the peak/) && said(d1.s.said, /gone all dim\. The band's set too high/) && d1.b.at === 0 && d1.dome.done && d1.stations === 4 && said(d1.said, /I'll watch the clouds and set it/), { a: d1.a, s: d1.s, b: d1.b });

// ---------------------------------------------------------------- the bore: Ilka, the relay, the fight, the band
const b0 = await ev(() => {
  const G = game, f = G.flags;
  if (G.room?.id === 'obsv') { const e = G.room.exits[0]; P.through(e.x, e.z); }
  const fly = P.flyTo(1);
  P.talk('ilka', { run: true }); const B = G.rooms.desert.bore; P.use(B.x, B.z, { run: true });
  return { fly: fly.room, relay: !!f.c10_boreRelay };
});
iso('the bore fight beaten by the harness assist (the fight is chapter10\'s and segment 13\'s)');
const b1 = await ev(() => {
  const G = game, f = G.flags;
  for (let k = 0; k < 40 && !f.c10_lit_bore; k++) { P.assistFight({ r: 80 }); G.step(0.5); if (G.state === 'dialog') P.settle(); }
  for (let i = 0; i < 10; i++) G.step(0.1); P.settle();
  return { ...T.view(), ilka: T.at('ilka'), said: window.__said.slice(-4) };
});
console.log('the bore:', JSON.stringify({ b0, bore: b1.bore, said: b1.said }));
check("the bore's relay set, the fight over; the relay spits steam at LOW: Ilka, \"set too low\"; the dome hears it on the radio", b0.relay && b1.bore.lit && b1.bore.at === 0 && said(b1.said, /last of them\. Now look at your relay/) && said(b1.said, /spitting steam from every joint\. The band's set too low/) && said(b1.said, /n_pimradio: /) && !!b1.ilka, { bore: b1.bore, said: b1.said });
// a notch saved with its reading not yet heard (ISO: the dial's flag set to MID, right for the first conditions), then
// Save → Continue: the band already right is read on arrival
iso("the bore's band set to MID by its flag and saved before Ilka's reading (a notch saved, its reading not heard)");
await ev(() => { game.flags.c10_bandAt_bore = 1; T.nw().show(); game.save(false); });
await reload();
const a1 = await ev(() => { for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { ...T.view(), said: window.__said.slice(-3) }; });
check('Save → Continue with the band already right for the first conditions: on arrival Ilka reads it ("a steady breath"), the band counts', a1.room === 'desert' && a1.bore.band === 1 && a1.bore.at === 1 && said(a1.said, /steady breath/) && a1.state === 'play', { bore: a1.bore, said: a1.said, room: a1.room });
const b2 = await timed('bore', () => { const s = T.shift('bore'); const b = T.turn('bore'); for (let i = 0; i < 30; i++) game.step(0.1); P.settle(); return { s, b, ...T.view(), said: window.__said.slice(-6) }; });
console.log('the bore band:', JSON.stringify({ s: b2.s, b: b2.b, said: b2.said }));
check('the bore band: the vent surges, spitting again ("set too low"); HIGH by input, past Ilka and Dallan: Ilka keeps the band; all five lit, Baldino takes a ship to Citadel', said(b2.s.said, /vent roars/) && said(b2.s.said, /set too low/) && b2.b.kind === 'nw1band' && b2.b.at === 2 && b2.bore.done && b2.stations === 5 && said(b2.said, /Reading this vent is my trade anyway/) && said(b2.said, /Five lamps! All five!/), { s: b2.s, b: b2.b, stations: b2.stations });

// ---------------------------------------------------------------- the code box → chapter 15
const e0 = await ev(() => { const G = game; P.flyTo(0); const b = G.world.station.bore; const r = P.use(b.x, b.z + 3.6, { run: true, kind: 'c10console' }); P.settle(60); P.settle(30); return { r: r.r, key: G.flags.chapterKey, cards: [...window.__cards].slice(-2) }; });
check("the glider to Citadel, Baldino's code box at the station's bore: chapter 15 begins", e0.key === 'shell', e0);
console.log('NW-1 band time (bot game time, the relay on to the station done, every line read at once; a floor):', JSON.stringify(Object.fromEntries(Object.entries(bandTime).map(([k, v]) => [k, +v.toFixed(0)]))), `total ${(Object.values(bandTime).reduce((a, b) => a + b, 0) / 60).toFixed(1)} min`);

// ---------------------------------------------------------------- other ways in
// an older save: the valve room finished the old way (c10_valves, no band): kept, no float, no band
await saveWith(UP_TO_NETWORK, { c10_miraAsk: true, c10_valveSet: { 0: true, 1: true, 2: true }, c10_valves: true }, 'valves', 4995.8, 2.5);
await reload();
const a2 = await ev(() => { const it = []; const h = game.hero, p = T.nw().spot('valves'); if (p) { h.pos.set(p.x, 0, p.z + 0.9); game.story.interactables((d, m, o) => { if (d < m) it.push(o.kind); }, (x, z) => Math.hypot(x - h.pos.x, z - h.pos.z)); } const n0 = window.__said.length; P.talk('mira'); return { it, ...T.view(), said: window.__said.slice(n0) }; });
check('an older save whose valve room was finished the old way: the station stays done, no float and no band offered, Mira\'s own line', a2.room === 'valves' && a2.valves.done && !a2.valves.lit && a2.valves.float === false && !a2.it.includes('nw1band') && said(a2.said, /Steady as a heartbeat/), { valves: a2.valves, it: a2.it, said: a2.said });

// the base campaign never shows any of it
const base = await ev((F) => {
  const G = game; window.__said = [];
  for (const k of Object.keys(G.flags)) if (/^og6_|^c10_|^vm_/.test(k)) delete G.flags[k];
  Object.assign(G.flags, F, { exp_base: 1, chapter: 12, chapterKey: 'balances' }); delete G.flags.exp;
  G.story.applyFlags(); G.story.nextChapter(); G.step(0.5); P.settle();
  const brief = window.__said.slice();
  // (ISO: straight to the Water Office's valve room; the wheels by input)
  G.flags.c10_miraAsk = true; G.startTransition(() => G.enterRoom('valves', null, true)); for (let i = 0; i < 20; i++) G.step(0.1); P.settle();
  const V = G.rooms.valves, f = G.flags;
  for (let pass = 0; pass < 3 && !f.c10_valves; pass++) for (const v of V.valves) { if (f.c10_valves) break; P.use(v.x, v.z, { near: 0.9 }); P.settle(); }
  return { brief, num: G.story.number('network'), ...T.view(), said: window.__said.slice(-3) };
}, UP_TO_NETWORK);
console.log('base campaign:', JSON.stringify({ brief: base.brief.slice(0, 6), valves: base.valves, num: base.num }));
check('the base campaign (exp_base): no vm_3 and no floats in the briefing; the valve room relay done at once (no float, no band, Mira\'s own line)', base.key === 'network' && base.num === 10 && !base.vm3 && !said(base.brief, /Vesk's desk|brass floats/) && base.valves.done && !base.valves.lit && base.valves.float === false && said(base.said, /Steady as a heartbeat/) && !base.journal.some((k) => /^nw1_/.test(k)), { valves: base.valves, said: base.said, journal: base.journal });

done();
await browser.close();
