// WC-3 "Residents where the story goes" (docs/future/WORLD_CONSISTENCY.md R1, work order 3; src/game/storylife.js): the
// places chapters 4–9 use have residents with rounds. Played on the real game with deterministic stepping (game.step);
// each chapter state is set by its flags (ISO lines say so, as tests/cast-rounds.mjs), the hero put in the area by
// enterRoom/exitRoom. For each area and state:
//   - count: at least 6 residents of the area there (the dig's crew, the School, Lhar or the monastery, the council
//     quarter), in the state the story's flags say (Lhar before the lift's trips, the monastery after)
//   - stops: every stop of the round they walk stands on the planner's ground and 1.5 m or more from a story person's
//     mark and from their cast-round stops, a door (the story's, the area's houses, a room's exits), a prompt and a ball
//     target (a door a resident goes in at is its own stop: left out)
//   - 20 s of free play: each one not on post and not in a long sit moves; none dwells within 1.5 m of a mark, a door or
//     a prompt; no collider overlap; nothing goes into the flags
// and once each: the sandstorm sends the dig's crew in and gives them back (chapter 4, the storm brought on early:
// STAGED); a state change in view waits until they are out of sight (no one pops), then takes them; away from their
// area they sleep (no update, not moved); a talk stops one and turns it to Twinsen (STAGED: story.talk); a save and
// a reload (INPUT: the pause menu's Quit, then Continue) brings back the same state with nothing new in the save.
// Cost: the residents' update time per frame (CPU, SwiftShader container: no fps), and the draw calls and triangles
// they and the places' new things add to one frame where they are.
// Pictures (SHOTS=dir, default /dev/shm/wc3-shots/): one per area and state, not committed.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || '/dev/shm/wc3-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { await ev(() => game.renderer.render?.()); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
await open(page, '?nocine'); await menu(page, 'new');

const install = () => ev(async () => {
  const RL = await import('/src/game/roomlife.js'), RG = await import('/src/game/regions.js'), ST = await import('/src/game/storylife.js');
  Object.assign(window, { RL, RG, ST });
  window.BASE ||= JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    for (const id of RG.CHAPTER_AREAS[key] || []) G.regions.ensure(id, 'test');
    G.story.applyFlags(); G.step(0.2);
  };
  // the hero into an area (outdoor: at x, z; a room: at its spawn), the camera reset
  window.heroTo = (room, x, z, a = 0) => {
    const G = game, h = G.hero;
    if (room === 'citadel') G.exitRoom({ x: x ?? -42, z: z ?? -2, a }, true, true);
    else G.enterRoom(room, x != null ? { x, z, a } : null, true, true);
    if (x != null && room !== 'citadel') { h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; }
    h.onGround = true; h.vy = 0; if (G.camRig.lba) G.camRig.lba.init = false;
    G.story.refreshCast(); G.step(0.4); P.settle();
    return { room: G.room?.id ?? 'citadel', hero: [+h.pos.x.toFixed(1), +h.pos.z.toFixed(1)] };
  };
  window.res = (group) => ST.STORY_GROUP[group].map((id) => game.npcs.find((n) => n.def.id === id)).filter(Boolean);
  window.areaOf = (n) => (n.def.indoor ? n.def.room : n.def.area);
  // everything that answers E here, with its reach (cast-rounds.mjs prompts())
  window.prompts = () => {
    const G = game, out = []; let last = null;
    const dist = (x, z) => { last = { x, z }; return 0; };
    const consider = (d, r, it) => { if (last) out.push({ x: last.x, z: last.z, r, kind: it.kind + (it.label ? ':' + it.label : '') }); };
    try { G.story.interactables(consider, dist); G.story.chapters[0].baseInteractables(consider, dist, G.story.cur); } catch (e) { out.push({ err: String(e) }); }
    return out.filter((p) => p.x != null && !/^npc/.test(p.kind));
  };
  // the places a resident must keep 1.5 m from, in the area the hero is in: the story's people (where the chapter puts
  // them, and the stops of their cast rounds), the doors, the prompts, the ball targets
  window.spots = () => {
    const G = game, R = G.room, out = [], c = R ? (R.center || R.group?.position) : { x: G.hero.pos.x, z: G.hero.pos.z }, near = (p) => Math.hypot(p.x - G.hero.pos.x, p.z - G.hero.pos.z) < 90;
    const RS = G.story.interiors.rounds;
    for (const n of G.npcs) {
      if (n.def.ambient || !n.present || !near(n.pos)) continue;
      const m = n.placed || n.pos; out.push({ x: m.x, z: m.z, what: 'mark of ' + n.def.id });
      const D = RS.defFor?.(n);
      if (D?.ch) { try { for (const s of RL.castStops(G, D, n.placed, RS.castNav(D)) || []) if (!s.mark) out.push({ x: s.x, z: s.z, what: `${n.def.id}'s stop ${s.id}` }); } catch (e) { /* (no cast nav) */ } }
    }
    for (const d of G.story.doors()) if (near(d)) out.push({ x: d.x, z: d.z, what: 'door ' + (d.room || '') });
    for (const e of R?.exits || []) out.push({ x: e.x, z: e.z, what: 'exit ' + e.to });
    for (const d of [...(R?.houseDoors || []), ...(R?.lharDoors || []), ...(R?.shutDoors || [])]) if (near(d)) out.push({ x: d.x, z: d.z, what: 'house door' });
    for (const p of prompts()) if (near(p)) out.push({ x: p.x, z: p.z, what: 'prompt ' + p.kind });
    for (const b of R?.ballTargets || []) if (near(b)) out.push({ x: b.x, z: b.z, what: 'ball target' });
    void c;
    return out;
  };
  window.colliderHits = (n) => {
    const PH = game.physics, p = n.pos, out = [];
    for (const c of PH.near(p.x, p.z)) {
      if (!c.enabled || c.stair || c.top <= p.y + 0.05 || c.bottom >= p.y + 1.6) continue;
      if (PH._inside(c, p.x, p.z, 0.1)) out.push(`${p.x.toFixed(1)},${p.z.toFixed(1)} in ${c.type} ${c.x.toFixed(1)},${c.z.toFixed(1)}`);
    }
    return out;
  };
  // the residents of a group here now: present (or gone in at a door), in this area, not taken off by the story
  window.here = (group) => res(group).filter((n) => !n.def.pending && n.stops.length && n.away !== 'story' && (n.present || n.inside) && areaOf(n) === (game.room?.id ?? 'citadel'));
  // the round's stops: on the ground, clear of the spots
  window.stopCheck = (ns) => {
    const sp = spots(), out = {};
    for (const n of ns) {
      const bad = [], nav = n.W.nav;
      for (const s of n.stops) {
        const c = nav.nearest ? nav.nearest(s.x, s.z, 1) : null;
        if (nav.nearest && (!c || Math.hypot(c.x - s.x, c.z - s.z) > 0.6)) bad.push(`${s.id}: no ground there`);
        if (s.door) continue;   // (its own door: it goes in there)
        for (const p of sp) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < 1.5) bad.push(`${s.id} ${d.toFixed(2)} m from ${p.what}`); }
      }
      out[n.def.id] = { phase: n.phaseKey ?? (n.def.indoor ? 'room' : '?'), stops: n.stops.map((s) => s.id), bad };
    }
    return out;
  };
  // free play: the hero stands; every 0.1 s a step
  window.freePlay = (ns, secs = 20) => {
    const G = game, sp = spots(), out = { people: {}, flagsAdded: 0 }, f0 = JSON.stringify(G.flags);
    const W = [G.walkers, G.roomWalkers].filter(Boolean);
    for (const w of W) { w.measure = true; w.stats.ms = 0; }
    const rec = new Map();
    for (const n of ns) rec.set(n, { p0: [n.pos.x, n.pos.z], ri0: n.ri, tmr0: n.inside ? n.insideT : n.st === 'chat' || n.st === 'pairwait' ? Math.max(0, (n.W.pair(n.stop?.pair || '-').until || 0) - G.time) : n.tmr, st0: n.st, moved: 0, prev: [n.pos.x, n.pos.z], stops: new Set([n.stop?.id]), near: new Set(), hits: new Set() });
    const frames = secs * 10;
    for (let i = 0; i < frames; i++) {
      G.step(0.1);
      for (const n of ns) {
        const r = rec.get(n);
        r.moved += Math.hypot(n.pos.x - r.prev[0], n.pos.z - r.prev[1]); r.prev = [n.pos.x, n.pos.z];
        r.stops.add(n.stop?.id);
        if (['dwell', 'seated', 'pairwait', 'chat'].includes(n.st) && !n.stop?.door && n.present) for (const p of sp) { const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z); if (d < 1.5) r.near.add(`${n.stop?.id} ${d.toFixed(2)} m from ${p.what}`); }
        if (i % 5 === 0 && n.present && !n.sit) for (const h of colliderHits(n)) r.hits.add(h);
      }
    }
    for (const n of ns) { const r = rec.get(n); out.people[n.def.id] = { moved: +r.moved.toFixed(1), stops: [...r.stops], tmr0: +r.tmr0.toFixed(1), st0: r.st0, post: ST.ON_POST.has(n.def.id), near: [...r.near].slice(0, 4), hits: [...r.hits].slice(0, 3), st: n.st, log: n.log.slice(-4) }; }
    out.msPerFrame = +(W.reduce((a, w) => a + w.stats.ms, 0) / frames).toFixed(4);
    for (const w of W) w.measure = false;
    out.flagsSame = JSON.stringify(G.flags) === f0;
    out.state = G.state;
    return out;
  };
  // the draw calls and triangles of one frame (as tests/drawcalls.mjs: every draw the renderer makes, both passes)
  window.frameCost = () => {
    const G = game, R = G.renderer.renderer; let calls = 0, tris = 0;
    const orig = R.renderBufferDirect.bind(R);
    R.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => { calls++; const n = geo.index ? geo.index.count : geo.attributes.position?.count || 0; tris += (obj.isInstancedMesh ? obj.count : 1) * n / 3; return orig(cam, scene, geo, mat, obj, grp); };
    G.perf?.beginFrame?.(); G.frame(1 / 30, true);
    R.renderBufferDirect = orig;
    return { calls, tris: Math.round(tris) };
  };
});
await install();

const verdictPlay = (label, fp) => {
  for (const [id, q] of Object.entries(fp.people)) {
    const exempt = q.post || q.tmr0 > 18;   // (on post by design, or in a long sit or dwell begun before the 20 s)
    check(`${label}, ${id}: in 20 s of free play ${exempt ? '(on post or a long sit: not asked to walk) ' : 'it moves; '}it never dwells within 1.5 m of a mark, a door or a prompt; no collider overlap`, (exempt || q.moved > 0.5 || q.stops.length > 1) && !q.near.length && !q.hits.length, q);
  }
  check(`${label}: nothing of the residents goes into the flags (nothing saved); play goes on`, fp.flagsSame && fp.state === 'play', { flagsSame: fp.flagsSame, state: fp.state });
};
const cost = [];
// one area in one state: count, stops, free play
async function area(label, group, want, place, min = 6, { mixed = false } = {}) {
  const at = await ev(([p]) => heroTo(p.room, p.x, p.z, p.a), [place]);
  iso(`${label}: the hero put in ${at.room} at ${at.hero}`);
  const pre = await ev(([group, want, mixed]) => {
    window.mine = (g) => here(g).filter((n) => !mixed || n.def.indoor || n.phaseKey === want);
    const ns = mine(group), all = res(group);
    return { n: ns.length, ids: ns.map((n) => n.def.id), phases: ns.map((n) => n.phaseKey ?? 'room'), wrong: want ? ns.filter((n) => !n.def.indoor && n.phaseKey !== want).map((n) => n.def.id) : [], away: all.filter((n) => !ns.includes(n)).map((n) => `${n.def.id}:${n.away || (n.present ? 'elsewhere' : 'hidden')}`), stops: stopCheck(ns) };
  }, [group, want, mixed]);
  check(`${label}: ${pre.n} residents here (at least ${min})${want ? `, all in the state '${want}'` : ''}`, pre.n >= min && !pre.wrong.length, { ids: pre.ids, phases: pre.phases, wrong: pre.wrong, away: pre.away });
  for (const [id, q] of Object.entries(pre.stops)) check(`${label}, ${id}: every stop of its round (${q.phase}) on the ground and 1.5 m or more from the marks, the doors, the prompts`, !q.bad.length, q);
  const fp = await ev(([group]) => freePlay(mine(group), 20), [group]);
  verdictPlay(label, fp);
  for (const [id, q] of Object.entries(fp.people)) console.log(`  ${id}: ${q.stops.join(' → ')} (walked ${q.moved} m${q.post ? ', on post' : ''})`);
  cost.push({ label, n: pre.n, msPerFrame: fp.msPerFrame });
  await shot(label.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
  return pre;
}

const DONE6 = { c6_started: true, c6_bridge: true, c6_lhar: true, c6_yorna: true, c6_heat: true, c6_thawed: true, c6_liftReady: true, c6_sword: true, c6_rope: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true };
const TRIP1 = { c6_started: true, c6_bridge: true, c6_lhar: true, c6_yorna: true, c6_heat: true, c6_thawed: true, c6_liftReady: true, c6_sword: true, c6_rope: true, c6_trip1: true };
const YARD = { room: 'desert', x: 3444, z: 3, a: 0 }, PLAZA = { room: 'desert', x: 3343.5, z: -71.8, a: -1.5 }, LHAR = { room: 'hamalayi', x: 4290, z: 19.5, a: Math.PI }, CAMP = { room: 'hamalayi', x: 4346, z: -29.5, a: Math.PI };
const run = (l) => !ONLY || ONLY.test(l);

// ---------------------------------------------------------------- chapter 4
if (run('chapter 4')) {
  await ev(() => setChapter('dig', { c4_started: true }));
  iso('chapter 4: its start (c4_started)');
  await area('chapter 4, the dig\'s crew', 'dig', 'crew', YARD, 8);
  await area('chapter 4, the School\'s plaza', 'school', 'school', PLAZA, 4);
  await area('chapter 4, the School\'s classroom', 'school', null, { room: 'school' }, 3);
  const all = await ev(() => res('school').filter((n) => !n.def.pending && n.stops.length && n.away !== 'story').length);
  check('chapter 4, the School: at least 6 residents (the plaza and the classroom)', all >= 6, all);
  // the sandstorm (STAGED: Ilka's storms, brought on at once): the crew shelters, and comes back when it has blown over
  const st = await ev(() => {
    const G = game, cur = G.story.cur, out = {};
    heroTo('desert', 3350, 6, 0);   // (in Kesh: the yard far out of sight)
    G.flags.c4_ilka = true; cur.stormT = 50 - 28 + 0.2;
    for (let i = 0; i < 40 && !cur.stormy; i++) G.step(0.1);
    G.step(0.4);
    out.stormy = !!cur.stormy; out.outInStorm = res('dig').filter((n) => n.present && n.away !== 'story').map((n) => n.def.id);
    for (let i = 0; i < 400 && cur.stormy; i++) G.step(0.1);
    G.step(0.4);
    out.after = !cur.stormy; out.backAfter = here('dig').length;
    G.flags.c4_ilka = false; delete G.flags.c4_ilka; G.step(0.2);
    return out;
  });
  check('chapter 4 (STAGED storm): while the sandstorm blows the crew is in; afterwards all eight are back at work', st.stormy && st.outInStorm.length === 0 && st.after && st.backAfter === 8, st);
}

// ---------------------------------------------------------------- chapter 5
if (run('chapter 5')) {
  await ev(() => setChapter('steam', {}));
  iso('chapter 5: its start (no flags: the opening talk at the plaza still to come)');
  await area('chapter 5 before the order, the dig\'s crew', 'dig', 'crew', YARD, 8);
  await ev(() => { heroTo('desert', 3350, 6, 0); game.flags.c5_planned = true; game.flags.c5_ferryTaken = true; game.story.refreshCast(); game.step(0.5); });
  iso('chapter 5: the plan made, the ferry taken (c5_planned, c5_ferryTaken), with the hero in Kesh');
  const p5 = await area('chapter 5 after the order, the dig\'s crew (packing)', 'dig', 'pack', YARD, 6);
  check('chapter 5 after the order: two of the crew have gone with the ferry (Benno, Kasp), six pack up', p5.n === 6 && ['dg_rod', 'dg_dig'].every((id) => p5.away.some((a) => a.startsWith(id + ':story'))), p5);
  await area('chapter 5, the School\'s plaza', 'school', 'school', PLAZA, 4);
}

// ---------------------------------------------------------------- chapter 6
if (run('chapter 6')) {
  await ev(() => setChapter('pass', { c6_started: true, c6_bridge: true, c6_lhar: true }));
  iso('chapter 6: Lhar reached (c6_started, c6_bridge, c6_lhar)');
  await area('chapter 6 before the lift, Lhar', 'village', 'lhar', LHAR, 8);
  // the first trip goes up while he watches the village (STAGED: its flags and the cast's placing, as pass.js trip()
  // does after the ride): whoever he can see stays in view until out of sight; then the first trip's people are up
  const df = await ev(([T]) => {
    const G = game, out = {};
    const ns = res('village'), seen0 = ns.filter((n) => !G.walkers.unseen(n.pos.x, n.pos.z, n.pos.y)).map((n) => n.def.id);
    Object.assign(G.flags, T); G.story.refreshCast(); G.step(0.6);
    out.seenBefore = seen0;
    out.poppedInView = seen0.filter((id) => { const n = G.npcs.find((q) => q.def.id === id); return !n.present && !n.inside; });
    out.waiting = ns.filter((n) => n.wantPhase !== undefined).map((n) => n.def.id);
    heroTo('citadel'); G.step(0.6);
    out.afterLeaving = Object.fromEntries(ns.map((n) => [n.def.id, n.phaseKey]));
    return out;
  }, [TRIP1]);
  check('chapter 6, the first trip goes up in view: nobody he can see vanishes; the change waits until they are out of sight, then the first trip\'s four are at the monastery and the second trip\'s four still in Lhar',
    df.seenBefore.length > 0 && df.poppedInView.length === 0 && df.waiting.length > 0 && ['lh_bero', 'lh_sana', 'lh_kid1', 'lh_mira'].every((id) => df.afterLeaving[id] === 'mon') && ['lh_old', 'lh_tam', 'lh_kid2', 'lh_grum'].every((id) => df.afterLeaving[id] === 'lhar'), df);
  // asleep away from their area: not moved, no update
  const sl = await ev(() => {
    const G = game, ns = res('village'), p0 = ns.map((n) => [n.pos.x, n.pos.z]);
    for (let i = 0; i < 100; i++) G.step(0.1);
    return { away: ns.map((n) => n.away), moved: ns.map((n, k) => +Math.hypot(n.pos.x - p0[k][0], n.pos.z - p0[k][1]).toFixed(3)) };
  });
  check('chapter 6, the hero on Citadel: the Hamalayi\'s residents sleep (no update) and stay exactly where they were', sl.away.every((a) => a === 'sleep') && sl.moved.every((d) => d === 0), sl);
  // a save and a reload (INPUT): the same state comes back; nothing of the residents is in the save
  await ev(() => heroTo('hamalayi', 4290, 19.5, Math.PI));
  if (!process.env.NORELOAD) {
    const sav = await ev(() => { game.save(false); const raw = JSON.stringify(localStorage); return { story: /dg_|sc_|lh_|zc_|up_|phaseKey|wantPhase/.test(raw.replace(/rs_|n_/g, '')) }; });
    await quitAndKeep(page, context, '/dev/shm/wc3-residents-storage.json');
    await open(page, '?nocine'); await menu(page, 'continue');
    await install();
    const rl = await ev(() => { const G = game; G.step(0.5); return { room: G.room?.id, chapter: G.flags.chapterKey, phases: Object.fromEntries(res('village').map((n) => [n.def.id, n.away === 'story' ? 'away' : n.phaseKey])) }; });
    check('chapter 6 after the first trip, saved and reloaded (INPUT: Quit, Continue): the save holds nothing of the residents; the first trip\'s four are at the monastery, the rest in Lhar',
      !sav.story && rl.chapter === 'pass' && ['lh_bero', 'lh_sana', 'lh_kid1', 'lh_mira'].every((id) => rl.phases[id] === 'mon') && ['lh_old', 'lh_tam', 'lh_kid2', 'lh_grum'].every((id) => rl.phases[id] === 'lhar'), { sav, rl });
    try { fs.unlinkSync('/dev/shm/wc3-residents-storage.json'); } catch { /* (gone) */ }
  }
  await area('chapter 6 between the trips, Lhar', 'village', 'lhar', LHAR, 4, { mixed: true });
  await area('chapter 6 between the trips, the monastery\'s camp', 'village', 'mon', CAMP, 4, { mixed: true });
  await ev(([D]) => { heroTo('citadel'); Object.assign(game.flags, D); game.story.refreshCast(); game.step(0.6); }, [DONE6]);
  iso('chapter 6: the column is up (c6_trip2, c6_up), set with the hero on Citadel');
  await area('chapter 6 after the column, the monastery', 'village', 'mon', CAMP, 8);
}

// ---------------------------------------------------------------- chapter 7
if (run('chapter 7')) {
  // (ob_snow: wave 3's snow remark is a story beat out of the yard, not the residents': taken as seen here)
  await ev(([D]) => setChapter('observatory', { ...D, c7_started: true, ob_snow: true }), [DONE6]);
  iso('chapter 7: its start (chapter 6 done, c7_started, the snow remark seen)');
  await area('chapter 7, the monastery', 'village', 'mon', CAMP, 8);
}

// ---------------------------------------------------------------- chapter 9
if (run('chapter 9')) {
  await ev(() => setChapter('council', { c2_shield: true, c9_started: true }));
  iso('chapter 9: its start (c9_started; chapter 3\'s shield up, so the depot is quiet)');
  const out = await area('chapter 9, the council house on the street', 'council', 'council', { room: 'zeelich', x: 2380, z: 3.5, a: Math.PI }, 4);
  const inn = await area('chapter 9, the council\'s antechamber', 'council', null, { room: 'upper' }, 4);
  check('chapter 9, the council quarter: at least 6 residents (the street before the council house and the antechamber)', out.n + inn.n >= 6, { street: out.ids, upstairs: inn.ids });
  // a talk (STAGED: the story's talk as E would start it): the resident stops where it stands and turns to him
  const tk = await ev(() => {
    const G = game, h = G.hero, n = G.npcs.find((q) => q.def.id === 'up_courier');
    for (let i = 0; i < 200 && n.st !== 'walk'; i++) G.step(0.1);
    const walking = n.st === 'walk';
    h.pos.set(n.pos.x + 1.2, h.pos.y, n.pos.z); G.step(0.05);
    const p0 = [n.pos.x, n.pos.z]; G.story.talk(n);
    for (let i = 0; i < 20; i++) G.step(0.05);
    const dA = Math.abs(Math.atan2(Math.sin(n.angleTo(h) - n.angle), Math.cos(n.angleTo(h) - n.angle)));
    const o = { walking, state: G.state, engaged: n.engaged, drift: +Math.hypot(n.pos.x - p0[0], n.pos.z - p0[1]).toFixed(3), facing: +dA.toFixed(2) };
    for (let k = 0; k < 8 && G.state === 'dialog'; k++) { P.tap('KeyE', 0.12); for (let i = 0; i < 10; i++) G.step(0.05); }
    P.settle();
    const p1 = [n.pos.x, n.pos.z]; for (let i = 0; i < 150; i++) G.step(0.1);
    o.after = G.state; o.walkedOn = +Math.hypot(n.pos.x - p1[0], n.pos.z - p1[1]).toFixed(2);
    return o;
  });
  check('chapter 9, a courier spoken to while walking (STAGED talk): it stops, turns to Twinsen, and goes on afterwards', tk.walking && tk.state === 'dialog' && tk.engaged && tk.drift < 0.05 && tk.facing < 0.35 && tk.after === 'play' && tk.walkedOn > 0.3, tk);
  // the cost of the residents and the places' new things in one frame where they are (the street before the council house)
  const fc = await ev(() => {
    const G = game; heroTo('zeelich', 2380, 3.5, Math.PI); G.step(1);
    const mine = res('council').filter((n) => !n.def.indoor);
    const on = frameCost();
    const vis = mine.map((n) => n.rig.root.visible); mine.forEach((n) => { n.rig.root.visible = false; if (n.shadow) n.shadow.visible = false; });
    const off = frameCost();
    mine.forEach((n, k) => { n.rig.root.visible = vis[k]; if (n.shadow) n.shadow.visible = vis[k]; });
    return { with: on, without: off, residents: mine.length };
  });
  console.log(`  frame cost, Zeelich's street: ${fc.with.calls} draws / ${fc.with.tris} triangles with the council quarter's ${fc.residents}; ${fc.without.calls} / ${fc.without.tris} without them`);
  cost.push({ label: 'frame, Zeelich street', draws: fc.with.calls - fc.without.calls, tris: fc.with.tris - fc.without.tris });
}
// the dig's yard: its residents and the yard's things
if (run('chapter 4') || run('cost')) {
  const fd = await ev(() => {
    const G = game; setChapter('dig', { c4_started: true }); heroTo('desert', 3444, 3, Math.PI * 0.75); G.step(1);
    const mine = res('dig'), D = G.regions.built('desert'), things = D._storyLife;
    const on = frameCost();
    const vis = mine.map((n) => n.rig.root.visible); mine.forEach((n) => { n.rig.root.visible = false; if (n.shadow) n.shadow.visible = false; });
    const noRes = frameCost();
    things.visible = false; const bare = frameCost(); things.visible = true;
    mine.forEach((n, k) => { n.rig.root.visible = vis[k]; if (n.shadow) n.shadow.visible = vis[k]; });
    return { with: on, noResidents: noRes, bare, residents: mine.length, meshes: things.children.length };
  });
  console.log(`  frame cost, the dig's yard: ${fd.with.calls} draws / ${fd.with.tris} triangles with the crew (${fd.residents}) and the yard's things (${fd.meshes} merged meshes); ${fd.noResidents.calls} / ${fd.noResidents.tris} without the crew; ${fd.bare.calls} / ${fd.bare.tris} without the things either`);
  cost.push({ label: 'frame, the dig\'s yard: the crew', draws: fd.with.calls - fd.noResidents.calls, tris: fd.with.tris - fd.noResidents.tris });
  cost.push({ label: 'frame, the dig\'s yard: the yard\'s things', draws: fd.noResidents.calls - fd.bare.calls, tris: fd.noResidents.tris - fd.bare.tris });
}

// a baseline on this machine, the same measure: Citadel's own residents round the square (chapter 2, the water back)
if (run('baseline')) {
  const bl = await ev(() => {
    setChapter('project', { c1_water: true }); heroTo('citadel', -42, 2, Math.PI);
    const ns = game.walkers.res.filter((n) => !n.def.story && n.present && !n.away && Math.abs(n.pos.x) < 300);
    const fp = freePlay(ns, 20);
    return { n: ns.length, msPerFrame: fp.msPerFrame };
  });
  cost.push({ label: 'baseline: Citadel\'s residents, chapter 2 (the same measure)', ...bl });
}
console.log('COST (CPU per frame of every resident\'s update while there; SwiftShader container: no fps):');
for (const c of cost) console.log('  ' + JSON.stringify(c));
done();
await browser.close();
