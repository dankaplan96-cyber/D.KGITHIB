// WC-5 "A guard test" (docs/future/WORLD_CONSISTENCY.md, work order 5): what chapters 1–4 gained must not be lost by a
// later chapter or a change. Three parts, thresholds from what the game has now (it passes today, a drop fails):
//   1. Residents: for each chapter's start state (1–10 and the epilogue; 11–12 are uninhabited by design: the shell and
//      the core), the residents in each area the chapter uses, from the existing rosters (the town's walkrounds.js,
//      Kesh's and Zeelich's street, WC-3's storylife.js, the rooms' and the spaceports' roomlife.js): at least MIN.
//      STATE (the chapter's flags set, as tests/residents.mjs and cast-rounds.mjs do; ISO lines say so); counted with
//      the hero indoors in his house, so a state change waiting for "out of sight" (story/citizens.js) has happened.
//   2. The cast moves: at each chapter's start state, the hero put in the places its cast stands (7 m from the first
//      one, as tests/cast-rounds.mjs), 30 s of free play (deterministic steps): of the story's people present there
//      (within 40 m, or in the room), those with a round now (WC-2's castrounds.js and the household rounds:
//      roomlife.js StoryRounds.defFor) — the deliberately still ones (the sneak, the disguise, the dial bank, guards,
//      puzzle and fight places: castrounds.js's header, WC-2's merge commit) have none — and how many moved (> 0.5 m).
//      Both counts at least MOVE's.
//   3. Journeys (static, no browser): every Game.startTransition call in src/game/story/*.js is on the allow-list
//      below with its kind and reason; a planet or region change must go through a journey film (crossByShip,
//      storyJourney, the travel's travelTo: the helper is called in the same method); the known gaps are listed
//      as such (KNOWN lines). A new call, a call gone, or a film gone fails: classify it here.
// SwiftShader container: no fps; the counts and the moves are the measure. CALIBRATE=1 prints the measured numbers
// as the tables' rows (to set the thresholds after a deliberate change).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { check, done } = checker();
const iso = (s) => console.log('ISO  ' + s);
const CAL = !!process.env.CALIBRATE;

// ---------------------------------------------------------------- 3. journeys (static)
// [file, the method the call is in, kind, why]. kind: 'film:<helper>' (a journey film plays first; the helper must be
// called in the same method), 'same' (no planet or region change), 'cut' (the story cuts to another place or time:
// not a journey), 'gap' (a region change with no film: known, listed)
const TRANSITIONS = [
  ['chapter1.js', 'zoeSpotted', 'same', "chapter 2, Zoé's sneak: caught, back at the office's door (the same room)"],
  ['chapter1.js', 'toZeelich', 'film:crossByShip', 'chapter 2 → 3: Citadel → Zeelich by the project ship (take-off, cabin, space)'],
  ['chapter2.js', 'startZoe', 'cut', "chapter 3: the story cuts to Zoé at Citadel's lighthouse (another character's scene, not a journey)"],
  ['chapter2.js', 'endZoe', 'cut', 'chapter 3: back to Twinsen on Zeelich'],
  ['chapter2.js', 'crossHome', 'film:crossByShip', "chapter 3 → 4: Doran's ship from Zeelich Spaceport, then the ferry seen coming in to Kesh's pier (WC-1; WC-4: a save resumed after the console scene too)"],
  ['chapter3.js', 'toCore', 'same', 'chapter 11 → 12: on down through the shell (the underground)'],
  ['chapter3.js', 'interact', 'same', "chapter 11: into the shaft at Citadel's station (on foot, down its ladder: the underground under Citadel)"],
  ['chapter3.js', 'finish', 'cut', 'chapter 12 → the epilogue: home a few days later (a cut in time)'],
  ['council.js', 'verdict', 'same', "chapter 9 → 10: the council chamber → Baldino's workshop, both on Zeelich"],
  ['council.js', 'spotted', 'same', 'chapter 9, the archive: spotted, back to its door (the same room)'],
  ['dig.js', 'readCarving', 'same', 'chapter 4 → 5: Desert Island, both'],
  ['evacuation.js', 'interact', 'film:crossByShip', 'chapter 8 → 9: Citadel → Zeelich by a project ship'],
  ['evacuation.js', 'startZoe', 'same', "chapter 8: Zoé's part, on Citadel"],
  ['evacuation.js', 'endZoe', 'same', "chapter 8: back to Twinsen at the station's control room, on Citadel"],
  ['islands.js', 'board', 'film:travelTo', "a terminal's counter: out through the gate under the black, then the travel's journey film from the pad"],
  // (GLIDER-FILM, 5.11, split fly: fly plays the glider's film (storyJourney) and then calls flyTo, whose scene change
  //  this is; with the films off, or no parked glider at either end, flyTo's plain fade alone)
  ['network.js', 'flyTo', 'gap', "chapter 10: the scene change behind Hesk's glider film between Twinsun's regions (plain with the films off)"],
  ['network.js', 'talk', 'same', "chapter 10: Mira takes him down into FunFrock's valve room (a room of Citadel)"],
  ['network.js', 'sendCode', 'same', "chapter 10 → 11: Citadel's station → the shaft under it"],
  ['observatory.js', 'leave', 'film:storyJourney', "chapter 7 → 8: Hesk's glider from the monks' slope to Citadel's glider field (WC-1)"],
  ['pass.js', 'trip', 'same', "chapter 6: the lift's trip up to the monastery (the Hamalayi)"],
  ['pass.js', 'update', 'same', 'chapter 6 → 7: the Hamalayi, both'],
  ['prologue.js', 'endPrologue', 'same', "chapter 1 → 2: up from the well's cave into Citadel's square"],
  ['sewers.js', 'rideStep', 'same', "the sewer lift under the lane by the pump (a room under Citadel)"],
  ['steam.js', 'board', 'film:storyJourney', "chapter 5 → 6: Hesk's glider from the dunes over the buried hall to the Hamalayi field (WC-1)"],
];
{
  const dir = ROOT + 'src/game/story/', found = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
    const L = fs.readFileSync(dir + f, 'utf8').split('\n');
    // (a class's methods start two spaces in: each call belongs to the method it is in; the method's code is its text)
    const meth = [];
    L.forEach((line, i) => { const m = line.match(/^ {2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/); if (m && !/^(if|for|while|switch|catch)$/.test(m[1])) meth.push({ fn: m[1], from: i }); });
    meth.forEach((m, k) => { m.to = meth[k + 1]?.from ?? L.length; });
    const code = (m) => L.slice(m.from, m.to).filter((x) => !/^\s*\/\//.test(x)).join('\n');
    L.forEach((line, i) => {
      if (/^\s*\/\//.test(line) || !/startTransition\(/.test(line)) return;
      const m = [...meth].reverse().find((q) => q.from <= i);
      found.push({ file: f, fn: m?.fn ?? null, line: i + 1, text: m ? code(m) : line });
    });
  }
  const want = TRANSITIONS.map(([file, fn, kind, why]) => ({ file, fn, kind, why, used: false }));
  const bad = [], films = [], gaps = [];
  for (const c of found) {
    const e = want.find((w) => !w.used && w.file === c.file && w.fn === c.fn);
    if (!e) { bad.push(`${c.file}:${c.line} in ${c.fn}: a startTransition not on the allow-list (classify it: a film, the same region, a cut, or a gap)`); continue; }
    e.used = true;
    if (e.kind.startsWith('film:')) {
      const h = e.kind.slice(5);
      if (!new RegExp(`\\b${h}\\(`).test(c.text)) bad.push(`${c.file}:${c.line} in ${c.fn}: should go through ${h} (its journey film), not called in ${c.fn}`);
      else films.push(`${c.file} ${c.fn}: ${h}`);
    }
    if (e.kind === 'gap') gaps.push(`${c.file}:${c.line} ${c.fn}: ${e.why}`);
  }
  for (const w of want) if (!w.used) bad.push(`${w.file} ${w.fn} (${w.kind}): on the allow-list but no such call any more (update the list)`);
  check(`journeys (static): all ${found.length} startTransition calls in src/game/story/*.js are on the allow-list; every planet or region change named a film goes through its film (${films.length}: ${films.map((x) => x.split(': ')[1]).join(', ')})`, bad.length === 0, bad);
  for (const g of gaps) console.log('KNOWN a region change with no journey film: ' + g);
  // (the story's crossings between the planets, WC-1 and PLANET-1: each through the ship's film)
  const src = (f) => fs.readFileSync(dir + f, 'utf8');
  const ship = [['chapter1.js', /toZeelich\(\)\s*\{[\s\S]{0,400}crossByShip\(/], ['chapter2.js', /toShell\(\)\s*\{[\s\S]{0,200}if \(f\.c2_done\) \{ this\.crossHome\(\); return; \}[\s\S]{0,1200}this\.crossHome\(\);[\s\S]{0,1000}crossHome\(\)\s*\{[\s\S]{0,300}crossByShip\(g, go, \{ aboard: \[doran\], onward: \{ to: 'desert_ferry'/], ['evacuation.js', /case 'c8ship':[\s\S]{0,200}crossByShip\(/]];
  const shipBad = ship.filter(([f, re]) => !re.test(src(f))).map(([f]) => f);
  check('journeys (static): the three story crossings between the planets (chapters 2 → 3, 3 → 4, 8 → 9) go through the ship\'s film (crossByShip), chapter 3\'s with the ferry onward to Kesh', shipBad.length === 0, shipBad);
  const glide = [['steam.js', /storyJourney\(g, \{ from: this\.roofSpot\(\), to: 'hamalayi_glider', mode: 'glider'/], ['observatory.js', /storyJourney\(g, \{ from: this\.slopeSpot\(\), to: 'citadel_glider', mode: 'glider'/]];
  const glideBad = glide.filter(([f, re]) => !re.test(src(f))).map(([f]) => f);
  check('journeys (static): the story\'s glider crossings (chapters 5 → 6, 7 → 8, WC-1) go through the glider\'s film (storyJourney)', glideBad.length === 0, glideBad);
}

// ---------------------------------------------------------------- the game
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(async () => {
  const RG = await import('/src/game/regions.js');
  window.BASE = JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: key !== 'well', intro: true, chapterKey: key, c1_water: key !== 'well', c1_done: key !== 'well' && key !== 'project' }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    for (const id of RG.CHAPTER_AREAS[key] || []) G.regions.ensure(id, 'test');
    G.story.applyFlags(); G.step(0.2);
  };
  // every area and room with residents, built once (the counts then do not depend on what a chapter happened to build)
  for (const id of ['zeelich', 'desert', 'hamalayi', 'tavern', 'bazoo', 'ticket', 'pharmacy', 'nbrhouse', 'nellhouse', 'baggage', 'terminal', 'zterminal', 'school', 'upper', 'workshop', 'obsv', 'house', 'office']) game.regions.ensure(id, 'test');
  game.step(0.5);
  const ROOMS7 = new Set(['tavern', 'bazoo', 'ticket', 'pharmacy', 'nbrhouse', 'nellhouse', 'baggage']);
  const band = (x) => (Math.abs(x) < 400 ? 'citadel' : x > 2200 && x < 2700 ? 'zeelich' : x > 3200 && x < 3700 ? 'desert' : x > 4100 && x < 4600 ? 'hamalayi' : 'other');
  // the area a resident lives in: its room (the seven Citadel rooms together), its story area, or where it walks
  window.areaKey = (r) => (r.def.indoor ? (ROOMS7.has(r.def.room) ? 'citadel_rooms' : r.def.room) : r.def.area || band(r.stops[0]?.x ?? r.pos.x));
  // the residents there now: given their round, not taken off by the story (asleep away from their area counts: it is there)
  window.residents = () => {
    const G = game, out = {};
    for (const r of [...(G.walkers?.res || []), ...(G.roomWalkers?.res || [])]) {
      if (r.def.pending || !r.stops.length || r.away === 'story') continue;
      if (!(r.present || r.inside || r.away === 'sleep')) continue;
      const k = areaKey(r); (out[k] ||= []).push(r.def.id);
    }
    return out;
  };
  // the hero into an area: a room at its spawn; outdoors 7 m from the first of `ids` on the planner's ground (or x, z)
  window.heroTo = (room, ids = [], at = null) => {
    const G = game, h = G.hero;
    if (room === 'citadel') { if (G.room) G.exitRoom({ x: -42, z: -2, a: 0 }, true, true); }
    else if (G.room?.id !== room) G.enterRoom(room, null, true, true);
    G.story.refreshCast(); G.step(0.3);
    const R = G.room;
    if (R && !R.outdoor && R.spawn) h.pos.set(R.spawn.x, G.physics.groundAt(R.spawn.x, R.spawn.z), R.spawn.z);
    else {
      const n0 = G.npcs.find((n) => n.def.id === ids[0] && n.present), m = at || n0?.pos, nav = G.walkers.nav;
      let best = null;
      if (m) for (let k = 0; k < 24 && !best; k++) { const a = k * 0.785, r = 7 + (k >> 3) * 2, x = m.x + Math.sin(a) * r, z = m.z + Math.cos(a) * r; const c = nav.nearest(x, z, 1); if (c && G.npcs.every((q) => !q.present || q.def.ambient || Math.hypot(q.pos.x - c.x, q.pos.z - c.z) > 3)) best = c; }
      if (best) h.pos.set(best.x, G.physics.groundAt(best.x, best.z), best.z);
    }
    h.onGround = true; h.vy = 0; if (G.camRig.lba) G.camRig.lba.init = false;
    G.step(0.4); P.settle();
    return { room: G.room?.id ?? 'citadel', hero: [+h.pos.x.toFixed(1), +h.pos.z.toFixed(1)] };
  };
  // 30 s of free play: the story's people present here (in the room, or within 40 m), which have a round now, which moved
  window.castMoves = (secs = 30) => {
    const G = game, h = G.hero, RS = G.story.interiors.rounds, here = G.room?.id ?? 'citadel', inRoom = !!G.room && !G.room.outdoor;
    const ppl = G.npcs.filter((n) => !n.def.ambient && n.present && n.rig?.root && (inRoom ? Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 30 : Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 40));
    const rec = ppl.map((n) => { const D = RS.defFor(n); return { n, round: !!D && (D.room === here || D.room === G.room?.id), prev: [n.pos.x, n.pos.z], d: 0 }; });
    for (let i = 0; i < secs * 10; i++) { G.step(0.1); for (const r of rec) { r.d += Math.hypot(r.n.pos.x - r.prev[0], r.n.pos.z - r.prev[1]); r.prev = [r.n.pos.x, r.n.pos.z]; } }
    const out = rec.map((r) => ({ id: r.n.def.id, round: r.round, moved: r.d > 0.5, d: +r.d.toFixed(1) }));
    return { present: out.length, withRound: out.filter((o) => o.round).length, moved: out.filter((o) => o.moved).length, movedWithRound: out.filter((o) => o.round && o.moved).length, people: out, state: G.state };
  };
});

// ---------------------------------------------------------------- the chapters: start states, areas, thresholds
// MIN: the residents per area at the chapter's start (today's counts). Areas: the street of a region ('citadel',
// 'zeelich', 'desert', 'hamalayi': the town's, Kesh's and Zeelich's street residents and WC-3's), 'citadel_rooms' (the
// seven Citadel interiors' people), the terminals ('terminal', 'zterminal'), the decks ('port_citadel', 'port_zeelich'),
// and WC-3's rooms ('school', 'upper').
// MOVE: [room, the cast to stand by, the chapter's people with a round there now (at least: today's), of them moved in
// 30 s (at least: three in four of today's, one at least; every one of them moved today)]. Measured on 3.11.2026 (WC-5).
const DONE6 = { c6_started: true, c6_bridge: true, c6_lhar: true, c6_yorna: true, c6_heat: true, c6_thawed: true, c6_liftReady: true, c6_sword: true, c6_rope: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true };
const CH = [
  { n: '1', key: 'well', flags: {},
    MIN: { citadel: 11, citadel_rooms: 13, terminal: 4, port_citadel: 2 },
    MOVE: [['house', ['zoe', 'arthur'], 1, 1], ['citadel', ['pippa'], 0, 0]] },
  { n: '2', key: 'project', flags: { c1_started: true },
    MIN: { citadel: 11, citadel_rooms: 13, terminal: 4, port_citadel: 2 },
    MOVE: [['house', ['zoe', 'arthur'], 2, 1], ['office', ['gilbert', 'mira'], 1, 1], ['citadel', ['pippa'], 0, 0]] },
  { n: '3', key: 'zeelich', flags: { c2_started: true },
    MIN: { zeelich: 3, zterminal: 2, port_zeelich: 2 },
    MOVE: [['zeelich', ['nara', 'oku'], 2, 1], ['workshop', ['baldino'], 1, 1]] },
  { n: '4', key: 'dig', flags: { c4_started: true },
    MIN: { desert: 15, school: 3 },
    MOVE: [['desert', ['hesk', 'tarra'], 4, 3], ['desert', ['dtrader', 'dkid'], 4, 3]] },
  { n: '5', key: 'steam', flags: {},
    MIN: { desert: 15, school: 3 },
    MOVE: [['desert', ['hesk', 'tarra'], 2, 1]] },
  { n: '6', key: 'pass', flags: { c6_started: true },
    MIN: { hamalayi: 8 },
    MOVE: [['hamalayi', ['yorna', 'pim'], 5, 3]] },
  { n: '7', key: 'observatory', flags: { ...DONE6, c7_started: true },
    MIN: { hamalayi: 8 },
    MOVE: [['hamalayi', ['yorna', 'pim', 'lhar1'], 5, 3], ['obsv', ['keeper'], 1, 1]] },
  { n: '8', key: 'evacuation', flags: { c8_started: true },
    MIN: { citadel: 2, citadel_rooms: 2, terminal: 8, port_citadel: 4 },
    MOVE: [['citadel', ['gilbert'], 3, 2], ['citadel', ['farmer1'], 4, 3], ['citadel', ['tim', 'lulu', 'xil'], 3, 2]] },
  { n: '9', key: 'council', flags: { c2_shield: true, c9_started: true },
    MIN: { zeelich: 7, upper: 5, zterminal: 4, port_zeelich: 2 },
    MOVE: [['zeelich', ['nara', 'oku'], 2, 1], ['workshop', ['baldino'], 1, 1]] },
  { n: '10', key: 'network', flags: { c10_started: true, c10_pulse: true },
    MIN: { citadel: 11, citadel_rooms: 13, terminal: 5, port_citadel: 4, zeelich: 3, zterminal: 2, port_zeelich: 2, desert: 7, school: 3, hamalayi: 8 },
    MOVE: [['zeelich', ['oku'], 1, 1], ['desert', ['hesk'], 1, 1], ['hamalayi', ['hesk'], 1, 1], ['citadel', ['hesk'], 1, 1]] },
  { n: 'epilogue', key: 'home', flags: { ep_dinner: true, ep_free: true },
    MIN: { citadel: 11, citadel_rooms: 13, terminal: 5, port_citadel: 4 },
    MOVE: [['house', ['zoe', 'arthur'], 2, 1]] },
];
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const table = [], cal = [];
for (const C of CH) {
  if (ONLY && !ONLY.test(C.key)) continue;
  const label = C.n === 'epilogue' ? 'the epilogue' : `chapter ${C.n}`;
  const res = await ev(([C]) => { setChapter(C.key, C.flags); heroTo('house'); game.step(1); return residents(); }, [C]);
  iso(`${label} (${C.key}): its start state set by its flags ${JSON.stringify(C.flags)}; the hero put in his house (enterRoom) to count`);
  const counts = Object.fromEntries(Object.keys(C.MIN).map((k) => [k, (res[k] || []).length]));
  const short = Object.entries(C.MIN).filter(([k, m]) => counts[k] < m).map(([k, m]) => `${k}: ${counts[k]} < ${m} (${(res[k] || []).join(', ')})`);
  check(`${label}: residents in each area it uses at least today's (${Object.entries(C.MIN).map(([k, m]) => `${k} ${counts[k]}/${m}`).join(', ')})`, short.length === 0, short);
  const row = { chapter: C.n, counts, moves: [] };
  const moveCal = [];
  for (const [room, ids, wantR, wantM] of C.MOVE) {
    const at = await ev(([room, ids]) => heroTo(room, ids), [room, ids]);
    const mv = await ev(() => castMoves(30));
    iso(`${label}: the hero put in ${at.room} at ${at.hero} (by ${ids.join(', ')}); 30 s of free play`);
    check(`${label}, ${room} (by ${ids.join(', ')}): of ${mv.present} story people present, ${mv.withRound} have a round now (at least ${wantR}) and ${mv.movedWithRound} of them moved in 30 s (at least ${wantM}); ${mv.moved} moved in all; play goes on`,
      mv.withRound >= wantR && mv.movedWithRound >= wantM && mv.state === 'play', mv.people.map((p) => `${p.id}${p.round ? '*' : ''}:${p.d}`).join(' '));
    row.moves.push({ room, by: ids[0], present: mv.present, withRound: mv.withRound, moved: mv.movedWithRound, movedAll: mv.moved });
    moveCal.push([room, ids, mv.withRound, mv.movedWithRound]);
  }
  table.push(row);
  cal.push(`  { n: '${C.n}', key: '${C.key}', MIN: ${JSON.stringify(counts)}, MOVE: ${JSON.stringify(moveCal)} },`);
}
console.log('TABLE (chapter: residents per area | the cast: present / with a round / of those moved / moved in all):');
for (const r of table) console.log(`  ${r.chapter.padEnd(8)} ${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ')} | ${r.moves.map((m) => `${m.room}@${m.by} ${m.present}/${m.withRound}/${m.moved}/${m.movedAll}`).join('; ')}`);
if (CAL) { console.log('CALIBRATE (today\'s numbers, as the tables\' rows):'); for (const l of cal) console.log(l); }
done();
await browser.close();
