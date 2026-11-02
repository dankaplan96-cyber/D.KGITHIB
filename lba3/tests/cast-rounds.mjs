// WC-2 "The cast moves" (docs/future/WORLD_CONSISTENCY.md R2): the story's people who stood on their marks all chapter in
// chapters 3–10 walk small rounds (src/game/castrounds.js, driven by roomlife.js StoryRounds), and the epilogue's family
// keeps its household rounds. Played on the real game, deterministic stepping (game.step), each chapter state set by its
// flags (as tests/interior-life.mjs; ISO lines say so), the hero put in the area by enterRoom/exitRoom:
//   - stops: every stop of every round resolves on the planner's ground (none dropped), keeps clear of the doors, the
//     chapter's prompts and puzzle pieces (their reach and 0.5 m), the signs, and 2 m from every other story person
//     standing there (their talk reach stays theirs); the yard's way from the gate stays clear (chapter 7)
//   - 60 s of free play: each person visits at least 2 stops; zero collider overlaps (walls, furniture, props)
//   - a talk (INPUT: he walks up and presses E, as tests/interior-life.mjs) while they walk: they stop and face him
//   - a scene's placement (STAGED: the chapter's place for them changed for the test) takes them at once; given back,
//     they are exactly on their mark; a cut-scene freezes them; the hero gone (40 m off or out of the area) puts them
//     back on the mark; nothing of a round is in the flags (nothing saved)
//   - left out on purpose: the people of the sneak (chapter 4's post), the disguise (chapter 9's archive) and the dial
//     bank (chapter 10's lamp room) stand still
//   - cost: CPU time of the rounds' updates per frame (SwiftShader container: no fps)
// MAP=1 prints each round's area as text (the planner's ground, the stops, the people, the prompts) for authoring.
// Pictures (SHOTS=dir, default /dev/shm/cast-rounds-shots/): one per case, not committed.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker();
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || '/dev/shm/cast-rounds-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { await ev(() => game.renderer.render?.()); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
await open(page, '?nocine'); await menu(page, 'new');

await ev(async () => {
  const RL = await import('/src/game/roomlife.js'), CR = await import('/src/game/castrounds.js'), RG = await import('/src/game/regions.js');
  Object.assign(window, { RL, CR, RG });
  window.BASE = JSON.parse(JSON.stringify(game.flags));
  window.RS = () => game.story.interiors.rounds;
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: key !== 'well', intro: true, chapterKey: key, c1_water: true, c1_done: true }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    for (const id of RG.CHAPTER_AREAS[key] || []) G.regions.ensure(id, 'test');
    G.story.applyFlags(); G.step(0.2);
  };
  // the hero to the case's area, at a spot `away` from the people (outdoors: 7 m off the first one's mark, on the planner's
  // ground; indoors: the room's door)
  window.goTo = (room, ids) => {
    const G = game, n0 = G.npcs.find((n) => n.def.id === ids[0]);
    if (room === 'citadel') { if (G.room) G.exitRoom({ x: n0.pos.x + 6, z: n0.pos.z, a: 0 }, true, true); }
    else if (G.room?.id !== room) G.enterRoom(room, null, true);
    G.story.refreshCast(); G.step(0.2);
    const h = G.hero, R = G.room, nav = G.walkers.nav;
    if (R && !R.outdoor && R.spawn) { h.pos.set(R.spawn.x, G.physics.groundAt(R.spawn.x, R.spawn.z), R.spawn.z); }
    else {
      const m = G.npcs.find((n) => n.def.id === ids[0]).pos;
      let best = null;
      for (let k = 0; k < 16 && !best; k++) { const a = k * 0.785, r = 7 + (k >> 3) * 2, x = m.x + Math.sin(a) * r, z = m.z + Math.cos(a) * r; const c = nav.nearest(x, z, 1); if (c && ids.every((id) => { const q = G.npcs.find((n) => n.def.id === id), so = stopsOf(q); return Math.hypot(q.pos.x - c.x, q.pos.z - c.z) > 4.5 && (so?.stops || []).every((s) => Math.hypot(s.x - c.x, s.z - c.z) > 3); })) best = c; }
      if (best) h.pos.set(best.x, G.physics.groundAt(best.x, best.z), best.z);
    }
    h.onGround = true; h.vy = 0; if (G.camRig.lba) G.camRig.lba.init = false;
    G.step(0.3); P.settle();
    return { room: G.room?.id ?? 'citadel', hero: [+h.pos.x.toFixed(1), +h.pos.z.toFixed(1)] };
  };
  // everything that answers E here (the prompts: the chapter's, the life's, the room searches) with its reach
  window.prompts = () => {
    const G = game, out = []; let last = null;
    const dist = (x, z) => { last = { x, z }; return 0; };
    const consider = (d, r, it) => { if (last) out.push({ x: last.x, z: last.z, r, kind: it.kind + (it.label ? ':' + it.label : '') }); };
    try { G.story.interactables(consider, dist); G.story.chapters[0].baseInteractables(consider, dist, G.story.cur); } catch (e) { out.push({ err: String(e) }); }
    if (!G.room) for (const s of G.world.signs || []) out.push({ x: s.x, z: s.z, r: 1.0, kind: 'sign' });
    return out;
  };
  window.colliderHits = (n) => {
    const PH = game.physics, p = n.pos, out = [];
    for (const c of PH.near(p.x, p.z)) {
      if (!c.enabled || c.stair || c.top <= p.y + 0.05 || c.bottom >= p.y + 1.6) continue;
      if (PH._inside(c, p.x, p.z, 0.1)) out.push(`${p.x.toFixed(1)},${p.z.toFixed(1)} in ${c.type} ${c.x.toFixed(1)},${c.z.toFixed(1)} top ${c.top.toFixed(2)}`);
    }
    return out;
  };
  window.stopsOf = (n) => { const G = game, D = RS().defFor(n); if (!D) return null; const nav = D.ch ? RS().castNav(D) : null; return { D, stops: D.ch ? RL.castStops(G, D, n.placed, nav) : null }; };
  window.textMap = (ids, R = 9) => {
    const G = game, n0 = G.npcs.find((n) => n.def.id === ids[0]), cx = n0.placed.x, cz = n0.placed.z, cell = 0.5;
    const D0 = RS().defFor(n0), nav = D0?.ch ? RS().castNav(D0) : G.walkers.nav, pts = [];
    ids.forEach((id, k) => { const n = G.npcs.find((q) => q.def.id === id), so = stopsOf(n); pts.push({ x: n.placed.x, z: n.placed.z, c: String(k) }); for (const [i, s] of (so?.stops || []).entries()) if (!s.mark) pts.push({ x: s.x, z: s.z, c: String.fromCharCode(97 + k * 4 + i) }); });
    for (const n of G.npcs) if (n.present && !ids.includes(n.def.id)) pts.push({ x: n.pos.x, z: n.pos.z, c: n.def.ambient ? 'r' : 'N' });
    for (const p of prompts()) if (p.x != null) pts.push({ x: p.x, z: p.z, c: 'I' });
    for (const d of [...G.story.doors(), ...(G.room?.exits || [])]) pts.push({ x: d.x, z: d.z, c: 'D' });
    const rows = [];
    for (let z = cz - R; z <= cz + R + 1e-6; z += cell) {
      let s = '';
      for (let x = cx - R; x <= cx + R + 1e-6; x += cell) {
        const p = pts.find((q) => Math.abs(q.x - x) <= cell / 2 && Math.abs(q.z - z) <= cell / 2);
        if (p) { s += p.c; continue; }
        const [ix, iz] = nav.cellOf(x, z), c = nav.info(ix, iz); s += c.ok ? '.' : '#';
      }
      rows.push(s);
    }
    const inR = (p) => Math.abs(p.x - cx) <= R && Math.abs(p.z - cz) <= R;
    const named = [...prompts().filter((p) => p.x != null && inR(p)).map((p) => `I ${p.kind} r${p.r}@${p.x.toFixed(1)},${p.z.toFixed(1)}`), ...G.npcs.filter((n) => n.present && inR(n.pos)).map((n) => `${n.def.ambient ? 'r' : 'N'} ${n.def.id}@${n.pos.x.toFixed(1)},${n.pos.z.toFixed(1)}`)];
    ids.forEach((id, k) => { const so = stopsOf(G.npcs.find((q) => q.def.id === id)); for (const [i, s] of (so?.stops || []).entries()) if (!s.mark) named.push(`${String.fromCharCode(97 + k * 4 + i)} ${id}:${s.id}@${s.x.toFixed(1)},${s.z.toFixed(1)}`); });
    return `centre ${cx.toFixed(1)},${cz.toFixed(1)} (x → right, z ↓; 0.5 m)\n` + rows.join('\n') + '\n' + named.join(' | ');
  };
});

// ---- the cases: each chapter's free play where these people have a round
const DONE6 = { c6_started: true, c6_bridge: true, c6_lhar: true, c6_yorna: true, c6_heat: true, c6_thawed: true, c6_liftReady: true, c6_sword: true, c6_rope: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true };
const CASES = [
  { label: 'chapter 3, Zeelich\'s street', key: 'zeelich', flags: { c2_started: true, c2_planTaken: true }, room: 'zeelich', ids: ['nara', 'oku'] },
  { label: 'chapter 3, Baldino\'s workshop', key: 'zeelich', flags: { c2_started: true, c2_planTaken: true, c2_plan: true }, room: 'workshop', ids: ['baldino'], ways: { to: 'prompts' } },
  { label: 'chapter 4, Kesh', key: 'dig', flags: { c4_started: true }, room: 'desert', ids: ['hesk', 'tarra'] },
  { label: 'chapter 4, Ilka\'s camp', key: 'dig', flags: { c4_started: true, c4_pumpTask: true, c4_pump: true, c4_trust: true }, room: 'desert', ids: ['ilka'] },
  { label: 'chapter 5, Kesh (the plan made)', key: 'steam', flags: { c5_planned: true, c5_ferryTaken: true }, room: 'desert', ids: ['ilka', 'tarra', 'hesk'] },
  { label: 'chapter 5, Kesh (the steam through)', key: 'steam', flags: { c5_planned: true, c5_ferryTaken: true, c5_dug: true, c5_routed: true, c5_dallanOK: true, c5_hatch: true, c5_relief: true, c5_vent: true }, room: 'desert', ids: ['dallan'] },
  { label: 'chapter 6, Lhar', key: 'pass', flags: { c6_started: true, c6_bridge: true, c6_lhar: true }, room: 'hamalayi', ids: ['yorna', 'pim', 'lhar1', 'lhar2', 'lhar3'] },
  { label: 'chapter 7, the monastery\'s yard', key: 'observatory', flags: { ...DONE6, c7_started: true }, room: 'hamalayi', ids: ['yorna', 'pim', 'lhar1', 'lhar2', 'lhar3'], keepOff: 'yard', ways: { from: 'gate', to: 'yard' } },
  { label: 'chapter 7, the observatory', key: 'observatory', flags: { ...DONE6, c7_started: true, c7_keeper: true }, room: 'obsv', ids: ['keeper'], ways: { to: 'prompts' } },
  { label: 'chapter 8, the well', key: 'evacuation', flags: { c8_started: true }, room: 'citadel', ids: ['gilbert'] },
  { label: 'chapter 8, the quay', key: 'evacuation', flags: { c8_started: true }, room: 'citadel', ids: ['tim', 'lulu', 'xil'], ways: { to: 'ferry' } },
  { label: 'chapter 9, Zeelich\'s street', key: 'council', flags: { c9_started: true, c9_form: true }, room: 'zeelich', ids: ['nara', 'oku'] },
  { label: 'chapter 9, Baldino\'s workshop', key: 'council', flags: { c9_started: true }, room: 'workshop', ids: ['baldino'] },
  { label: 'chapter 9, the council between sittings', key: 'council', flags: { c9_started: true, c9_form: true, c9_nara: true, c9_oku: true, c9_clerk: true, c9_heard: true }, room: 'council', ids: ['chair', 'councilB', 'councilC'], ways: { to: 'dais' } },
  { label: 'chapter 10, Baldino\'s workshop', key: 'network', flags: { c10_started: true, c10_pulse: true }, room: 'workshop', ids: ['baldino'] },
  { label: 'chapter 10, Zeelich\'s street', key: 'network', flags: { c10_started: true, c10_pulse: true }, room: 'zeelich', ids: ['oku'] },
  { label: 'chapter 10, the bore\'s post', key: 'network', flags: { c10_started: true, c10_pulse: true, c10_ilka: true }, room: 'desert', ids: ['ilka', 'dallan'] },
  { label: 'chapter 10, the glider at Desert Island', key: 'network', flags: { c10_started: true, c10_pulse: true }, room: 'desert', ids: ['hesk'] },
  { label: 'chapter 10, the glider at the Hamalayi', key: 'network', flags: { c10_started: true, c10_pulse: true }, room: 'hamalayi', ids: ['hesk'] },
  { label: 'chapter 10, the glider at Citadel', key: 'network', flags: { c10_started: true, c10_pulse: true }, room: 'citadel', ids: ['hesk'] },
  { label: 'the epilogue, home (household rounds)', key: 'home', flags: { ep_dinner: true, ep_free: true }, room: 'house', ids: ['zoe', 'arthur'], household: true },
];
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const cost = [];
const given = {};
for (const C of CASES) {
  if (ONLY && !ONLY.test(C.label)) continue;
  const at = await ev(([C]) => { setChapter(C.key, C.flags); return goTo(C.room, C.ids); }, [C]);
  iso(`${C.label}: chapter set by its flags (${C.key}); the hero put in ${at.room} at ${at.hero} (enterRoom/exitRoom and a placement)`);
  // ---- the stops, before anything moves
  const pre = await ev(([C]) => {
    const G = game, out = { people: {} };
    const others = G.npcs.filter((n) => n.present && !n.def.ambient && !C.ids.includes(n.def.id) && Math.hypot(n.pos.x - G.npcs.find((q) => q.def.id === C.ids[0]).pos.x, n.pos.z - G.npcs.find((q) => q.def.id === C.ids[0]).pos.z) < 30);
    const pr = prompts().filter((p) => p.x != null), doors = [...G.story.doors(), ...(G.room?.exits || [])];
    const yard = G.regions.built('hamalayi')?.monastery?.yard;
    for (const id of C.ids) {
      const n = G.npcs.find((q) => q.def.id === id), so = stopsOf(n), bad = [];
      if (!n.present) { out.people[id] = { absent: true }; continue; }
      if (!so) { out.people[id] = { noRound: true, placed: n.placed }; continue; }
      const stops = so.stops || [], want = so.D.stops.length;
      if (so.D.ch && stops.length < want) bad.push(`${want - stops.length} stop(s) left out (no ground there, or a door)`);
      for (const s of stops) {
        if (s.mark) continue;
        for (const p of pr) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < Math.min(p.r, 2.6) + 0.5 && !(p.kind.startsWith('npc'))) bad.push(`${s.id} ${d.toFixed(2)} m from the prompt ${p.kind} (reach ${p.r})`); }
        for (const d of doors) { const dd = Math.hypot(s.x - d.x, s.z - d.z); if (dd < (d.r || 0.9) + 1.0) bad.push(`${s.id} ${dd.toFixed(2)} m from a door`); }
        for (const o of others) { const d = Math.hypot(s.x - o.pos.x, s.z - o.pos.z); if (d < 2.0) bad.push(`${s.id} ${d.toFixed(2)} m from ${o.def.id}`); }
        for (const id2 of C.ids) { if (id2 === id) continue; const q = G.npcs.find((x) => x.def.id === id2); const d = Math.hypot(s.x - q.placed.x, s.z - q.placed.z); if (d < 1.2) bad.push(`${s.id} ${d.toFixed(2)} m from ${id2}'s mark`); }
        // (chapter 7: the way from the gate to the yard's middle, PATHS in hamalayi.js: x 34 ± 1.6 m, z −33 … −40, local)
        if (C.keepOff === 'yard' && yard && Math.abs(s.x - yard.x) < 1.6 + 0.5 && s.z > yard.z - 0.5) bad.push(`${s.id} on the way from the gate`);
      }
      out.people[id] = { round: so.D.ch ? 'cast' : 'household', stops: stops.map((s) => s.id), placed: { x: +n.placed.x.toFixed(2), z: +n.placed.z.toFixed(2) }, bad };
    }
    return out;
  }, [C]);
  if (process.env.MAP) console.log(await ev(([C]) => textMap(C.ids), [C]));
  for (const [id, q] of Object.entries(pre.people)) {
    check(`${C.label}, ${id}: present, with a ${C.household ? 'household' : 'cast'} round whose stops all stand on the ground, clear of the doors, the prompts and the other people's talk reach`, !q.absent && !q.noRound && (q.round === (C.household ? 'household' : 'cast')) && !(q.bad || []).length, q);
    given[id] = (given[id] || []).concat([`${C.key}: ${(q.stops || []).join(' → ')}`]);
  }
  // ---- 60 s of free play
  const live = await ev(([C]) => {
    const G = game, R = RS(), ppl = C.ids.map((id) => G.npcs.find((n) => n.def.id === id)), hits = {}, moved = {}, prev = {}, flags0 = Object.keys(G.flags).length;
    for (const n of ppl) { const S = R.st.get(n.def.id); if (S) S.log.length = 0; hits[n.def.id] = []; moved[n.def.id] = 0; prev[n.def.id] = [n.pos.x, n.pos.z]; }
    R.measure = true; R.stats.ms = 0; R.stats.frames = 0; R.stats.cast = 0;
    const t0 = performance.now();
    for (let i = 0; i < 600; i++) {
      G.step(0.1);
      for (const n of ppl) { hits[n.def.id].push(...colliderHits(n)); const p = prev[n.def.id]; moved[n.def.id] += Math.hypot(n.pos.x - p[0], n.pos.z - p[1]); prev[n.def.id] = [n.pos.x, n.pos.z]; }
    }
    const wall = performance.now() - t0;
    R.measure = false;
    const out = { people: {}, msPerFrame: +(R.stats.ms / 3600).toFixed(4), msPerDriven: +(R.stats.ms / Math.max(1, R.stats.frames)).toFixed(4), driven: R.stats.frames, wallMsPerFrame: +(wall / 3600).toFixed(3), flagsAdded: Object.keys(G.flags).length - flags0, state: G.state };
    for (const n of ppl) { const S = R.st.get(n.def.id), D = R.defFor(n); R.blockedBy = null; const why = D?.ch ? R.castBlock(n, D) : null; out.people[n.def.id] = { why, by: R.blockedBy, stops: S ? [...new Set(S.log.filter((l) => / at /.test(l)).map((l) => l.split(' at ')[1]))] : [], visits: S ? S.log.filter((l) => / at /.test(l)).length : 0, moved: +moved[n.def.id].toFixed(1), hits: [...new Set(hits[n.def.id])].slice(0, 5), log: S?.log.slice(-6) }; }
    return out;
  }, [C]);
  cost.push({ label: C.label, n: C.ids.length, ...live });
  for (const [id, q] of Object.entries(live.people)) {
    check(`${C.label}, ${id}: in 60 s of free play visits at least 2 stops of the round, with no collider overlap`, q.stops.length >= 2 && q.hits.length === 0, q);
    console.log(`  ${id}: ${q.stops.join(' → ')} (${q.visits} arrivals, walked ${q.moved} m, ${q.hits.length} collider overlaps)`);
  }
  check(`${C.label}: nothing of the rounds goes into the flags (nothing saved); play goes on`, live.flagsAdded === 0 && live.state === 'play', { flagsAdded: live.flagsAdded, state: live.state });
  await shot('case-' + C.key + '-' + C.ids[0]);
  // ---- a talk while they walk, by input
  for (const id of C.ids) {
    const tk = await ev(([id]) => {
      const G = game, n = G.npcs.find((q) => q.def.id === id), R = RS(), h = G.hero, out = {};
      let S = R.st.get(id);
      for (let i = 0; i < 500 && !(S?.active && S.st === 'walk'); i++) { G.step(0.1); S = R.st.get(id); }
      out.walking = S?.st === 'walk';
      let tg = null;
      for (let k = 0; k < 8 && !(tg?.kind === 'npc' && tg.id === id); k++) { P.go(n.pos.x, n.pos.z, { tol: 1.2, maxT: 8 }); P.face(n.pos.x, n.pos.z); tg = P.target(); }
      out.walkingAtE = S?.st === 'walk'; out.target = tg?.kind + ':' + tg?.id;
      P.tap('KeyE', 0.1);
      const p0 = [n.pos.x, n.pos.z]; for (let i = 0; i < 30; i++) G.step(0.05);
      const dA = Math.abs(Math.atan2(Math.sin(n.angleTo(h) - n.angle), Math.cos(n.angleTo(h) - n.angle)));
      out.inDialog = G.state === 'dialog' || G.state === 'shop'; out.drift = +Math.hypot(n.pos.x - p0[0], n.pos.z - p0[1]).toFixed(3); out.facing = +dA.toFixed(2);
      out.speaker = G.speaker === h ? 'hero' : G.speaker?.def?.id;
      // (he may be the first to speak: then they turn to him as they answer; read on until their line)
      for (let k = 0; k < 12 && out.inDialog && out.facing >= 0.35; k++) { P.tap('KeyE', 0.12); for (let i = 0; i < 20; i++) G.step(0.05); out.facing = +Math.abs(Math.atan2(Math.sin(n.angleTo(h) - n.angle), Math.cos(n.angleTo(h) - n.angle))).toFixed(2); out.drift = +Math.hypot(n.pos.x - p0[0], n.pos.z - p0[1]).toFixed(3); if (G.state !== 'dialog') break; }
      P.settle();
      // (a talk that opens a menu — Hesk's flights — is closed as a player would; a talk that moves the story on ends the round)
      for (let k = 0; k < 3 && G.state !== 'play'; k++) { P.tap('Escape', 0.2); P.settle(); }
      out.state = G.state; out.roundAfter = R.defFor(n)?.id ?? null;
      const p1 = [n.pos.x, n.pos.z]; for (let i = 0; i < 150; i++) G.step(0.1);
      out.after = +Math.hypot(n.pos.x - p1[0], n.pos.z - p1[1]).toFixed(2); out.afterSt = R.st.get(id)?.st; out.active = !!R.st.get(id)?.active;
      return out;
    }, [id]);
    check(`${C.label}, ${id}: a talk (INPUT) stops them where they are and they turn to Twinsen; afterwards the round goes on`, tk.inDialog && tk.drift < 0.05 && tk.facing < 0.35 && (tk.after > 0.3 || tk.active || tk.roundAfter === null), tk);
  }
  // ---- scenes: a placement takes them at once, back to free play they are on their mark; a cut-scene freezes them;
  //      the hero gone puts them back on their mark
  for (const id of C.ids) {
    const sc = await ev(([id, C]) => {
      const G = game, n = G.npcs.find((q) => q.def.id === id), R = RS(), out = {}, cur = G.story.cur, mark = { ...n.placed };
      for (let i = 0; i < 300 && Math.hypot(n.pos.x - mark.x, n.pos.z - mark.z) < 0.6; i++) G.step(0.1);
      out.offMark = +Math.hypot(n.pos.x - mark.x, n.pos.z - mark.z).toFixed(2);
      // the cut-scene state: the round stands still
      const p0 = [n.pos.x, n.pos.z]; G.setState('cutscene'); for (let i = 0; i < 20; i++) G.step(0.1); out.cutDrift = +Math.hypot(n.pos.x - p0[0], n.pos.z - p0[1]).toFixed(3); G.setState('play'); G.step(0.1);
      // STAGED: the chapter places them elsewhere for a scene (its place() answers another spot for them)
      const own = Object.prototype.hasOwnProperty.call(cur, 'place'), orig = cur.place, spot = { x: mark.x + 0.8, z: mark.z + 0.8, a: 1.0 };
      cur.place = function (q) { return q === id ? spot : orig.call(this, q); };
      G.story.refreshCast(); G.step(0.05);
      out.atScene = +Math.hypot(n.pos.x - spot.x, n.pos.z - spot.z).toFixed(3);
      for (let i = 0; i < 30; i++) G.step(0.1);
      out.sceneDrift = +Math.hypot(n.pos.x - spot.x, n.pos.z - spot.z).toFixed(3);
      if (own) cur.place = orig; else delete cur.place;
      G.story.refreshCast(); G.step(0.05);
      out.backOnMark = +Math.hypot(n.pos.x - mark.x, n.pos.z - mark.z).toFixed(3);
      // the hero gone (outdoors 50 m off; indoors out of the room): back on the mark, unseen
      for (let i = 0; i < 300 && Math.hypot(n.pos.x - mark.x, n.pos.z - mark.z) < 0.6; i++) G.step(0.1);
      out.offAgain = +Math.hypot(n.pos.x - mark.x, n.pos.z - mark.z).toFixed(2);
      const h = G.hero, hp = h.pos.clone();
      if (C.household || (G.room && !G.room.outdoor)) { out.left = 'room'; const e = G.room.exits.find((x) => !x.room) || G.room.exits[0]; P.through(e.x, e.z); }
      else { out.left = 'far'; const m2 = n.placed, dx = h.pos.x - m2.x, dz = h.pos.z - m2.z, l = Math.hypot(dx, dz) || 1; h.pos.x = m2.x + (dx / l) * 55; h.pos.z = m2.z + (dz / l) * 55; G.step(0.2); }
      out.goneOnMark = +Math.hypot(n.pos.x - mark.x, n.pos.z - mark.z).toFixed(3);
      out.household = !!C.household;
      return out;
    }, [id, C]);
    const ok = sc.cutDrift < 0.01 && sc.atScene < 0.01 && sc.sceneDrift < 0.01 && sc.backOnMark < 0.01 && (sc.household || sc.goneOnMark < 0.01);
    check(`${C.label}, ${id}: a cut-scene freezes the round; a scene's place (STAGED) takes them at once and holds them; back in free play they stand exactly on their mark; ${C.household ? '' : 'the hero gone, they are back on it'}`, ok, sc);
    // (back where the case put the hero, for the next person)
    await ev(([C]) => goTo(C.room, C.ids), [C]);
  }
  // ---- the ways stay open (INPUT: he walks there with each person held at each of their stops in turn)
  if (C.ways) {
    const wy = await ev(([C]) => {
      const G = game, R = RS(), h = G.hero, out = { tried: 0, blocked: [] };
      const m0 = G.npcs.find((n) => n.def.id === C.ids[0]).placed;
      const M = G.regions.built('hamalayi'), Cn = G.regions.built('council');
      const start = C.ways.from === 'gate' ? { x: M.monastery.gate.x, z: M.monastery.gate.z } : { x: h.pos.x, z: h.pos.z };
      let pts = [];
      if (C.ways.to === 'prompts' || C.ways.to === 'ferry') pts = prompts().filter((p) => p.x != null && !p.kind.startsWith('npc') && Math.hypot(p.x - m0.x, p.z - m0.z) < 10 && (C.ways.to !== 'ferry' || /ferry/.test(p.kind))).map((p) => ({ x: p.x, z: p.z, tol: Math.max(0.6, Math.min(p.r, 2.0) - 0.25), what: p.kind }));
      if (C.ways.to === 'yard') pts = [{ x: M.monastery.yard.x, z: M.monastery.yard.z + 2, tol: 1.0, what: 'the yard' }];
      if (C.ways.to === 'dais') pts = [{ x: Cn.center.x, z: Cn.center.z - 2.4, tol: 0.8, what: 'before the dais' }];
      for (const p of pts) p.what += `@${p.x.toFixed(1)},${p.z.toFixed(1)}`;
      // (first with everyone held on their marks: a point he cannot reach then is not the rounds' doing — listed apart)
      const hold = (n, S, i) => { const s = S.stops[i]; S.ri = i; n.pos.set(s.x, G.physics.groundAt(s.x, s.z), s.z); R.arrive(n, S); S.tmr = 1e9; n.sync(); };
      const tryAll = (list) => list.filter((p) => {
        h.pos.set(start.x, G.physics.groundAt(start.x, start.z), start.z); h.vy = 0; h.onGround = true; G.step(0.1);
        P.go(p.x, p.z, { tol: p.tol, maxT: 30 }); out.tried++;
        return Math.hypot(h.pos.x - p.x, h.pos.z - p.z) > p.tol + 0.35;
      });
      for (const id of C.ids) { const n = G.npcs.find((q) => q.def.id === id), S = R.st.get(id); if (S?.stops) hold(n, S, S.stops.findIndex((s) => s.mark)); }
      const base = tryAll(pts);
      out.unreachableAnyway = base.map((p) => p.what);
      pts = pts.filter((p) => !base.includes(p));
      out.points = pts.map((p) => p.what);
      for (const id of C.ids) {
        const n = G.npcs.find((q) => q.def.id === id), S = R.st.get(id);
        if (!S?.stops) { out.blocked.push(id + ': no round running'); continue; }
        S.stops.forEach((s, i) => {
          if (s.mark) return;
          for (const p of pts) {
            S.ri = i; n.pos.set(s.x, G.physics.groundAt(s.x, s.z), s.z); R.arrive(n, S); S.tmr = 1e9; n.sync();
            h.pos.set(start.x, G.physics.groundAt(start.x, start.z), start.z); h.vy = 0; h.onGround = true; G.step(0.1);
            P.go(p.x, p.z, { tol: p.tol, maxT: 30 }); out.tried++;
            const d = Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
            if (d > p.tol + 0.35) out.blocked.push(`${id} at ${s.id}: ${p.what} not reached (${d.toFixed(2)} m)`);
          }
          hold(n, S, S.stops.findIndex((q) => q.mark));
        });
      }
      for (const id of C.ids) { const S = R.st.get(id); if (S?.stops) S.tmr = 0.1; }
      P.settle();
      return out;
    }, [C]);
    check(`${C.label}: with each person held at each of their stops, he still walks (INPUT) to ${wy.points.join(', ') || '(nothing)'}`, wy.points.length > 0 && wy.blocked.length === 0, wy);
  }
}

// ---- left out on purpose: the sneak, the disguise, the dial bank (and the gate keepers): they stand
const still = await ev(() => {
  const G = game, R = RS(), out = {};
  const watch = (label, ids, secs = 30) => {
    const ppl = ids.map((id) => G.npcs.find((n) => n.def.id === id)).filter((n) => n?.present);
    const p0 = ppl.map((n) => [n.pos.x, n.pos.z]);
    for (let i = 0; i < secs * 10; i++) G.step(0.1);
    out[label] = { ids: ppl.map((n) => n.def.id), moved: ppl.map((n, k) => +Math.hypot(n.pos.x - p0[k][0], n.pos.z - p0[k][1]).toFixed(3)), rounds: ppl.map((n) => (R.st.get(n.def.id)?.active ? n.def.id : null)) };
  };
  setChapter('dig', { c4_started: true, c4_pumpTask: true, c4_pump: true, c4_trust: true, c4_ilka: true });
  goTo('desert', ['dallan']); watch('chapter 4, the research post (the sneak): Dallan, the gate guard', ['dallan', 'guard']);
  setChapter('council', { c9_started: true, c9_form: true, c9_nara: true, c9_oku: true, c9_clerk: true, c9_heard: true });
  goTo('archive', ['archivist']); out.archive = { watcher: !!G.story.cur.watcher?.active }; watch('chapter 9, the archive (the disguise): the archivist (the watcher walks him)', ['archivist'], 5);
  goTo('upper', ['clerk']); watch('chapter 9, the antechamber: the clerk at his counter', ['clerk']);
  setChapter('network', { c10_started: true, c10_pulse: true });
  goTo('lighttop', ['zoe']); watch('chapter 10, the lamp room (the dial bank): Zoé and Arthur', ['zoe', 'arthur']);
  return out;
});
for (const [label, q] of Object.entries(still)) {
  if (!q?.ids) continue;
  const ok = label.includes('archive') ? q.rounds.every((r) => r === null) : q.moved.every((d) => d < 0.01) && q.rounds.every((r) => r === null);
  check(`left out: ${label} — no round${label.includes('archive') ? '' : ', they stand on their marks'}`, q.ids.length > 0 && ok, q);
}

console.log('rounds given:');
for (const [id, l] of Object.entries(given)) console.log(`  ${id}: ${l.join(' | ')}`);
for (const c of cost) console.log(`MEASURE ${c.label}: the rounds' updates ${c.msPerFrame} ms per game frame (${c.n} people, ${c.driven} driven person-frames, ${c.msPerDriven} ms each); whole step ${c.wallMsPerFrame} ms/frame wall time with no rendering. SwiftShader container: CPU time, not fps.`);
await browser.close();
done();
