// WORLD-LIFE (WORKLIST #37): the residents who walk round Citadel (src/game/walkers.js, walknav.js, walkrounds.js,
// story/citizens.js). Played on the real game, deterministic stepping (game.step):
//   - the cast: ten residents on Citadel, none of them a story character; each has a round of stops, all walkable, none on
//     a doorway, none within reach of where a chapter puts its people (the stops are checked against every chapter's places)
//   - they walk: over 5 minutes every resident covers ground, visits its stops, never stands inside a collider, never in
//     water or on a slope the hero could not climb, never on a doorway (except at its own door), and stays near its planned
//     route; each leg of every round has a route
//   - the routine: they sit on benches, browse the stall, tend a bed, carry a basket / crate / can, chat in pairs (face
//     each other, take turns, the speaker's mouth moves), go in at their own door and come out again
//   - avoidance: a resident coming at the hero steps round him and never within 0.6 m; two coming at each other pass; the
//     hero is never moved by them
//   - stuck: stuck once, a resident plans again; stuck repeatedly out of sight it is put back on its way; in view it is
//     never moved, and gives the stop up in the end
//   - talk: spoken to, a resident stops, turns to Twinsen and talks (it is the speaker, its voice drives its mouth), then
//     walks on; the story's people are where the story puts them, unmoved by all this
//   - cost: residents far off or out of view are stepped coarsely (no animation, no physics), near ones every frame; the
//     measured cost per frame is reported
//   - the story: the evacuation takes them off the streets and gives them back
// ISO (logged): the world is stepped with every resident simulated in full (walkers.force) for the long runs, as the near ones
// are in play; the hero is put by exitRoom. Screenshots: SHOTS=dir.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker({ info: 'always' });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
const iso = (s) => console.log('ISO  ' + s);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { game.hero.hasBall = true; P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true }); game.exitRoom({ x: -42, z: 8, a: 0 }, true, true); game.step(0.5); });

// Citadel's residents: those with a round on the island (the others wait, hidden, for their area to be built)
await ev(() => { window.CIT = () => game.walkers.res.filter((r) => r.stops.length && Math.abs(r.stops[0].x) < 300);
  // every place the story puts a person (the cast's own spots and each chapter's, the town's stories'), asked through peek: an area
  // not built yet reads as missing, nothing is built by asking
  window.storyPlaces = () => { const G = game, st = G.story, out = [];
    G.regions.peek(() => { for (const n of G.npcs) { if (n.ambient) continue; if (!n.def.pending) out.push({ id: n.def.id, x: n.def.x, z: n.def.z });
      for (const c of [...st.chapters, st.life, st.workshop, st.kesh, st.zlife]) { try { const p = c.place(n.def.id); if (p && p.x != null && !(p.x === 0 && p.z === 0)) out.push({ id: n.def.id, x: p.x, z: p.z }); } catch (e) { /* needs its flags */ } } } });
    return out; };
  window.storyDoors = () => { const st = game.story, out = []; game.regions.peek(() => { for (const c of [...st.chapters, st.life]) { try { for (const d of c.doors()) out.push({ x: d.x, z: d.z, r: d.r || 0.9 }); } catch (e) { /* */ } } }); return out; };
});

// ---- the cast
const cast = await ev(() => { const G = game, W = G.walkers; const storyIds = new Set(G.npcs.filter((n) => !n.ambient).map((n) => n.def.id));
  return { n: CIT().length, all: W.res.length, ids: CIT().map((r) => r.def.id), stops: CIT().map((r) => r.stops.length), allIn: W.res.every((r) => G.npcs.includes(r)), clash: W.res.filter((r) => storyIds.has(r.def.id)).map((r) => r.def.id), present: CIT().filter((r) => r.present).length, waiting: W.res.filter((r) => r.def.pending).map((r) => r.def.id) }; });
check('ten residents walk round Citadel (six more wait, hidden, for Zeelich and Kesh to be built), all in the cast, none sharing an id with a story character', cast.n === 10 && cast.all === 16 && cast.waiting.length === 6 && cast.allIn && cast.clash.length === 0 && cast.present >= 9, cast);
check('each has a round of at least 3 stops', cast.stops.every((n) => n >= 3), cast.stops);
const texts = await ev(async () => { const { t } = await import('/src/game/i18n.js'); const W = game.walkers; return W.res.map((r) => [r.def.id, t('n_' + r.def.id) !== 'n_' + r.def.id, t('rs_' + r.def.id + '_0') !== 'rs_' + r.def.id + '_0']); });
check('every resident has a name and lines of their own', texts.every(([, a, b]) => a && b), texts.filter(([, a, b]) => !(a && b)));

// ---- the stops: walkable, off the doors, clear of the story's people in every chapter
const stops = await ev(() => { const G = game, W = G.walkers, nav = W.nav, st = G.story;
  const bad = [], doors = [];
  // the story's doors (every chapter) and every present story person's place across chapters
  doors.push(...window.storyDoors());
  const places = window.storyPlaces();
  for (const r of CIT()) for (const s of r.stops) {
    if (!nav.nearest(s.x, s.z, 0.01)) bad.push(`${s.id}: not walkable`);
    const wd = W.doorDist(s.x, s.z); if (wd < 0.8 && !s.door) bad.push(`${s.id}: on a doorway (${wd.toFixed(1)})`);
    for (const d of doors) if (!s.door && Math.hypot(d.x - s.x, d.z - s.z) < d.r + 0.9) bad.push(`${s.id}: on a story door`);
    for (const p of places) if (Math.hypot(p.x - s.x, p.z - s.z) < 1.0 && !s.seat) bad.push(`${s.id}: within 1 m of ${p.id}'s place (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
  }
  return { bad, places: places.length, doors: doors.length }; });
check('every stop is walkable, off every doorway and over a metre from every place a chapter puts anyone', stops.bad.length === 0, stops);
// every leg of every round has a route
const legs = await ev(() => { const W = game.walkers, nav = W.nav, bad = [], lens = [];
  for (const r of CIT()) for (let i = 0; i < r.stops.length; i++) { const a = r.stops[i], b = r.stops[(i + 1) % r.stops.length]; const j = nav.planSync(a, b, { key: `${r.def.id}:${a.id}>${b.id}` });
    if (!j.ok) bad.push(`${a.id}>${b.id}`); else { let d = 0; for (let q = 1; q < j.pts.length; q++) d += Math.hypot(j.pts[q].x - j.pts[q - 1].x, j.pts[q].z - j.pts[q - 1].z); lens.push(Math.round(d)); } }
  return { bad, legs: lens.length, longest: Math.max(...lens), total: lens.reduce((a, b) => a + b, 0) }; });
check('every leg of every round has a planned route', legs.bad.length === 0 && legs.legs >= 35, legs);

// ---- walking: five minutes, everyone simulated in full
iso('every resident simulated in full (walkers.force = 0); the hero stands in the square');
const story0 = await ev(() => game.npcs.filter((n) => !n.ambient && n.present).map((n) => [n.def.id, n.pos.x, n.pos.z]));
const run = await ev(() => { const G = game, W = G.walkers, P = G.physics; W.force = 0; W.measure = true; W.stats.ms = 0;
  const S = {}; const doorsOf = W.doors;
  for (const r of CIT()) S[r.def.id] = { dist: 0, lx: r.pos.x, lz: r.pos.z, inCol: 0, water: 0, steep: 0, onDoor: 0, away: 0, stops: new Set(), seated: 0, carried: new Set(), inside: 0, chat: 0, mouth: 0, tend: 0, maxDev: 0, samples: 0, pushed: 0 };
  const hx = G.hero.pos.x, hz = G.hero.pos.z;
  let frames = 0;
  for (let t = 0; t < 300; t += 0.5) {
    G.step(0.5, 1 / 30); frames += 15;
    for (const r of CIT()) { const s = S[r.def.id]; s.samples++;
      s.dist += Math.hypot(r.pos.x - s.lx, r.pos.z - s.lz); s.lx = r.pos.x; s.lz = r.pos.z; s.stops.add(r.stop.id);
      if (r.st === 'seated') s.seated++; if (r.st === 'inside') s.inside++; if (r.st === 'chat') s.chat++; if (r.carrying) s.carried.add(r.carrying); if (r.st === 'dwell' && r.stop.act === 'tend') s.tend++;
      if (r.rig.mOpen > 0.15) s.mouth++;
      if (!r.present) continue;
      if (['walk', 'plan', 'dwell', 'pairwait', 'chat'].includes(r.st)) {
        for (const c of P.near(r.pos.x, r.pos.z)) if (c.enabled && c.top > r.pos.y + 0.55 && c.bottom < r.pos.y + 1.6 && P._inside(c, r.pos.x, r.pos.z, 0.05)) { s.inCol++; break; }
        if (P.terrain.heightAt(r.pos.x, r.pos.z) < -0.2 && !P.groundInfo(r.pos.x, r.pos.z, r.pos.y + 0.3).brick) s.water++;
        if (P.steepAt(r.pos.x, r.pos.z, r.pos.y + 0.05, 1.2)) s.steep++;
        if (W.doorDist(r.pos.x, r.pos.z) < 0.35) s.onDoor++;
        // near its planned route (the smoothed path's polyline)
        if (r.st === 'walk' && r.path) { let best = 1e9; for (let i = Math.max(0, r.wi - 1); i < r.path.length - 1; i++) { const a = r.path[i], b = r.path[i + 1], dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz || 1, k = Math.max(0, Math.min(1, ((r.pos.x - a.x) * dx + (r.pos.z - a.z) * dz) / L)); best = Math.min(best, Math.hypot(r.pos.x - (a.x + dx * k), r.pos.z - (a.z + dz * k))); } if (best < 1e8) s.maxDev = Math.max(s.maxDev, best); }
      }
    }
  }
  const out = {}; for (const [id, s] of Object.entries(S)) out[id] = { ...s, stops: s.stops.size, carried: [...s.carried] };
  const ms = W.stats.ms; W.measure = false; W.force = null;
  return { out, frames, msPerFrame: +(ms / frames).toFixed(3), hero: [G.hero.pos.x - hx, G.hero.pos.z - hz], rescues: CIT().map((r) => r.rescues), noRoute: CIT().map((r) => r.log.filter((l) => /no route|gave|timed/.test(l)).length), nav: W.nav.stats }; });
const R = run.out, ids = Object.keys(R);
check('over five minutes every resident covers ground (≥ 40 m) and visits at least 3 different stops', ids.every((i) => R[i].dist >= 40 && R[i].stops >= 3), Object.fromEntries(ids.map((i) => [i, [Math.round(R[i].dist), R[i].stops]])));
check('no resident is ever inside a collider, in the water or on a slope the hero would slide down', ids.every((i) => R[i].inCol === 0 && R[i].water === 0 && R[i].steep === 0), Object.fromEntries(ids.map((i) => [i, [R[i].inCol, R[i].water, R[i].steep]])));
check('none stands on a doorway (a house door) while it walks or waits', ids.every((i) => R[i].onDoor === 0), Object.fromEntries(ids.map((i) => [i, R[i].onDoor])));
check('they keep to their planned routes (never more than 3 m off the route while avoiding others)', ids.every((i) => R[i].maxDev < 3.0), Object.fromEntries(ids.map((i) => [i, +R[i].maxDev.toFixed(1)])));
check('no resident gave a stop up or found no route in five minutes', run.noRoute.every((n) => n === 0), run.noRoute);
check('the hero was never moved by them (nobody pushes him)', Math.hypot(...run.hero) < 1e-6, run.hero);
check('the routine: benches are sat on, a load is carried, a bed tended, a door gone in at', ids.filter((i) => R[i].seated > 10).length >= 4 && ids.some((i) => R[i].carried.includes('basket')) && ids.some((i) => R[i].carried.includes('crate')) && ids.some((i) => R[i].carried.includes('can')) && R.garrick.tend > 5 && ids.filter((i) => R[i].inside > 4).length >= 3,
  { seated: ids.filter((i) => R[i].seated > 10), carried: ids.map((i) => [i, R[i].carried]).filter(([, c]) => c.length), tend: R.garrick.tend, inside: ids.filter((i) => R[i].inside > 4) });
check('a pair meets and chats: both talk for a good while, and a mouth moves', R.maro.chat > 30 && R.tilde.chat > 30 && (R.maro.mouth + R.tilde.mouth) > 10, { maro: [R.maro.chat, R.maro.mouth], tilde: [R.tilde.chat, R.tilde.mouth] });
const story1 = await ev(() => game.npcs.filter((n) => !n.ambient && n.present).map((n) => [n.def.id, n.pos.x, n.pos.z]));
check('the story\'s people have not moved (they stay exactly where the story puts them)', JSON.stringify(story0) === JSON.stringify(story1), story0.filter((s, i) => JSON.stringify(s) !== JSON.stringify(story1[i])));
console.log('NOTE five minutes, ten residents in full: ' + run.msPerFrame + ' ms per frame (CPU, headless Chromium; A* ' + JSON.stringify(run.nav) + ')');

// ---- avoidance: Pico walking the lane meets Twinsen standing in his way
iso('the hero stands on Pico\'s road (the lane) 5 m ahead of him; nothing else near');
const av = await ev(() => { const G = game, W = G.walkers, P = G.physics, h = G.hero;
  W.force = 0;
  const pico = CIT().find((r) => r.def.id === 'pico');
  // walk the others away: put everyone else out of the picture (inside their own stops, frozen), Pico at the lane's top
  for (const r of CIT()) if (r !== pico) r.away = 'test';
  pico.reset(); G.step(0.2);
  pico.ri = 1; pico.slotAt(pico.stops[1]); pico.arrived(pico.stops[1], true); pico.tmr = 0.1;   // pico_b (-44, 12.8) → pico_c (-46.4, 28.6), up the lane
  const a = pico.stops[1], b = pico.stops[2];
  // the hero in the middle of the lane between them
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2; h.pos.set(mx, P.groundAt(mx, mz, 30), mz); h.angle = Math.atan2(a.x - mx, a.z - mz); h.onGround = true; h.vy = 0; h.sync();
  const h0 = [h.pos.x, h.pos.z]; let minD = 1e9, passed = false, t = 0, waitMax = 0, maxW = 0; const side = [];
  for (; t < 60; t += 0.1) { G.step(0.1, 1 / 30); const d = Math.hypot(pico.pos.x - h.pos.x, pico.pos.z - h.pos.z); minD = Math.min(minD, d); maxW = Math.max(maxW, pico.waitT || 0);
    if (pico.ri === 2 && d > 3 && Math.hypot(pico.pos.x - b.x, pico.pos.z - b.z) < Math.hypot(h.pos.x - b.x, h.pos.z - b.z)) { passed = true; break; } }
  const moved = Math.hypot(h.pos.x - h0[0], h.pos.z - h0[1]);
  for (const r of CIT()) r.away = null; W.force = null;
  return { minD: +minD.toFixed(2), passed, t: +t.toFixed(1), moved, maxW: +maxW.toFixed(1), log: pico.log.slice(-4) }; });
check('Pico walking the lane steps round Twinsen standing in his way: gets past, never closer than 0.6 m', av.passed && av.minD >= 0.6, av);
check('…and Twinsen is exactly where he was (never pushed)', av.moved < 1e-6, av);
// two who meet head on pass
const hd = await ev(() => { const G = game, W = G.walkers, P = G.physics;
  W.force = 0; const A = CIT().find((r) => r.def.id === 'tobb'), B = CIT().find((r) => r.def.id === 'ume');
  for (const r of CIT()) if (r !== A && r !== B) r.away = 'test';
  G.hero.pos.set(-70, P.groundAt(-70, 20, 30), 20); G.hero.sync();
  // a straight open stretch of the harbour path: A walks east → west, B west → east, on one line
  const mk = (r, x0, x1, id) => { r.inside = false; r.setPresent(true); const s0 = { id: id + '0', x: x0, z: 36, a: x1 < x0 ? -1.57 : 1.57, act: 'stand', dur: [0.1, 0.2] }, s1 = { id: id + '1', x: x1, z: 36, a: 0, act: 'stand', dur: [30, 40] };
    r.stops = [s0, s1]; r.ri = 0; r.slotAt(s0); r.arrived(s0, true); r.tmr = 0.1; r.carrySet(null); };
  mk(A, -60, -84, 'A'); mk(B, -84, -60, 'B'); G.step(0.3);
  let minD = 1e9, t = 0; let crossed = false;
  for (; t < 60; t += 0.1) { G.step(0.1, 1 / 30); const d = Math.hypot(A.pos.x - B.pos.x, A.pos.z - B.pos.z); minD = Math.min(minD, d); if (A.pos.x < B.pos.x && t > 3) { crossed = true; if (d > 3) break; } }
  const out = { minD: +minD.toFixed(2), crossed, t: +t.toFixed(1), A: A.st, B: B.st, ax: +A.pos.x.toFixed(1), bx: +B.pos.x.toFixed(1) };
  for (const r of CIT()) r.away = null; W.force = null;
  return out; });
check('two residents coming at each other along the path pass each other (a clear side-step, no deadlock)', hd.crossed && hd.minD > 0.5, hd);

// ---- stuck: replan, then the fallback (never moved in view)
const stuck = await ev(() => { const G = game, W = G.walkers, P = G.physics, h = G.hero;
  const r = CIT().find((x) => x.def.id === 'marda'); W.force = 0;
  for (const o of CIT()) if (o !== r) o.away = 'test';
  r.reset(); G.step(0.2);
  r.ri = 2; r.slotAt(r.stops[2]); r.arrived(r.stops[2], true); r.tmr = 0.1; G.step(1.0);    // marda_mid → marda_gate: a walk of ~14 m
  const out = {};
  // 1) stuck once: it plans again, and carries on
  for (let i = 0; i < 30 && r.st !== 'walk'; i++) G.step(0.1, 1 / 30);
  out.walking = r.st === 'walk';
  const p0 = [r.pos.x, r.pos.z], rep0 = r.replans;
  r.stuckT = 2; G.step(0.1, 1 / 30);
  out.replanned = r.replans === rep0 + 1 && (r.st === 'plan' || r.st === 'walk');
  for (let i = 0; i < 40 && r.st !== 'walk'; i++) G.step(0.1, 1 / 30);
  out.walkedAgain = r.st === 'walk';
  // 2) stuck over and over IN VIEW (the camera sees it): never put anywhere, the stop is given up in the end
  const un = W.unseen; W.unseen = () => false;
  const res0 = r.rescues, pos1 = [r.pos.x, r.pos.z]; let gaveUp = false;
  for (let k = 0; k < 14; k++) { r.stuckT = 2; G.step(0.1, 1 / 30); for (let i = 0; i < 25 && r.st === 'plan'; i++) G.step(0.1, 1 / 30); if (r.log.some((l) => /gave the stop up/.test(l))) { gaveUp = true; break; } }
  out.inView = { rescues: r.rescues - res0, gaveUp, jump: +Math.hypot(r.pos.x - pos1[0], r.pos.z - pos1[1]).toFixed(1) };
  // 3) stuck out of sight: put back on its way, ahead
  W.unseen = () => true;
  r.reset(); G.step(0.2); r.ri = 2; r.slotAt(r.stops[2]); r.arrived(r.stops[2], true); r.tmr = 0.1;
  for (let i = 0; i < 40 && r.st !== 'walk'; i++) G.step(0.1, 1 / 30);
  const res1 = r.rescues, pos2 = [r.pos.x, r.pos.z];
  for (let k = 0; k < 4 && r.rescues === res1; k++) { r.stuckT = 2; G.step(0.1, 1 / 30); for (let i = 0; i < 40 && r.st === 'plan'; i++) G.step(0.1, 1 / 30); }
  out.unseen = { rescues: r.rescues - res1, jump: +Math.hypot(r.pos.x - pos2[0], r.pos.z - pos2[1]).toFixed(1), ok: P.groundAt(r.pos.x, r.pos.z) > 0.3 };
  W.unseen = un; for (const o of CIT()) o.away = null; W.force = null;
  return out; });
check('stuck once, a resident plans again and walks on', stuck.walking && stuck.replanned && stuck.walkedAgain, stuck);
check('stuck again and again in view of the camera: never moved, the stop is given up in the end', stuck.inView.rescues === 0 && stuck.inView.gaveUp && stuck.inView.jump < 6, stuck.inView);
check('stuck out of sight: put back on its way (ahead, on walkable ground)', stuck.unseen.rescues === 1 && stuck.unseen.jump >= 2 && stuck.unseen.ok, stuck.unseen);

// ---- talking to a walking resident
iso('Twinsen stands 1.5 m ahead of Ume as she walks the lane, facing her, and presses E');
const talk = await ev(() => { const G = game, W = G.walkers, P = G.physics, h = G.hero;
  W.force = 0; const u = CIT().find((r) => r.def.id === 'ume');
  for (const o of CIT()) if (o !== u) o.away = 'test';
  u.reset(); G.step(0.2); u.ri = 1; u.slotAt(u.stops[1]); u.arrived(u.stops[1], true); u.tmr = 0.1;
  for (let i = 0; i < 80 && !(u.st === 'walk' && u.path); i++) G.step(0.1, 1 / 30);
  for (let i = 0; i < 40; i++) G.step(0.1, 1 / 30);   // a few metres along
  const out = { walking: u.st === 'walk' };
  // in front of her, a metre and a half along her heading, facing her
  const hx = u.pos.x + Math.sin(u.angle) * 1.6, hz = u.pos.z + Math.cos(u.angle) * 1.6;
  h.pos.set(hx, P.groundAt(hx, hz, 30), hz); h.angle = u.angle + Math.PI; h.onGround = true; h.vy = 0; h.sync(); G.camRig.lba && (G.camRig.lba.init = false); G.step(0.3, 1 / 30);
  const prompt = game.findInteractable(); out.prompt = prompt?.kind === 'npc' ? prompt.npc.def.id : prompt?.kind;
  game.tryInteract();
  out.state = G.state; out.engaged = u.engaged; out.speaker = G.speaker === u;
  const at = [u.pos.x, u.pos.z]; let mouth = 0, faced = 0, minDiff = 9;
  for (let i = 0; i < 50 && G.state === 'dialog'; i++) { G.step(0.05, 1 / 30); mouth = Math.max(mouth, u.rig.mOpen || 0); const d = Math.abs(Math.atan2(Math.sin(u.angleTo(h) - u.angle), Math.cos(u.angleTo(h) - u.angle))); minDiff = Math.min(minDiff, d); }
  out.stayed = +Math.hypot(u.pos.x - at[0], u.pos.z - at[1]).toFixed(2); out.faceDiff = +minDiff.toFixed(2); out.mouth = +mouth.toFixed(2); out.state2 = G.state;
  return out; });
check('Twinsen\'s prompt is Ume (a walking resident can be talked to)', talk.walking && talk.prompt === 'ume', talk);
check('spoken to she stops where she is, turns to him and is the speaker', talk.state === 'dialog' && talk.engaged && talk.speaker && talk.stayed < 0.05 && talk.faceDiff < 0.5, talk);
const after = await ev(() => { const G = game, W = G.walkers, u = CIT().find((r) => r.def.id === 'ume');
  let n = 0; for (let i = 0; i < 400 && G.state === 'dialog'; i++) { G.input.taps.add('KeyE'); G.step(0.05, 1 / 30); n++; }
  const out = { state: G.state, engaged: u.engaged }; const p0 = [u.pos.x, u.pos.z];
  G.hero.pos.set(u.pos.x + 12, G.physics.groundAt(u.pos.x + 12, u.pos.z, 30), u.pos.z + 12); G.hero.sync();
  for (let i = 0; i < 60; i++) G.step(0.1, 1 / 30);
  out.moved = +Math.hypot(u.pos.x - p0[0], u.pos.z - p0[1]).toFixed(1); out.st = u.st; out.stop = u.stop.id;
  for (const o of CIT()) o.away = null; W.force = null;
  return out; });
check('when the talk ends she goes on with her walk', after.state === 'play' && !after.engaged && after.moved > 2, after);
const lines = await ev(() => { const G = game, S = G.story.citizens; const out = {};
  for (const r of G.walkers.res) { out[r.def.id] = S.linesFor(r).length; }
  return out; });
check('each resident has several lines to say (cycled, the first by what they are doing)', Object.values(lines).every((n) => n >= 2), lines);

// ---- LOD: far and unseen residents are stepped coarsely
iso('Twinsen at the quay, far from the lane and the square');
const lod = await ev(() => { const G = game, W = G.walkers, P = G.physics, h = G.hero;
  for (const r of CIT()) { r.away = null; r.reset(); }
  h.pos.set(-100, P.groundAt(-100, 38, 30), 38); h.angle = -1.57; h.sync(); G.camRig.lba && (G.camRig.lba.init = false); G.step(0.6, 1 / 30); G.renderer.render();
  W.measure = true; W.stats.ms = 0; W.stats.full = W.stats.reduced = W.stats.abstract = 0;
  const calls = new Map(), t2 = new Map(), moved = new Map(); for (const r of CIT()) { const f = r.rig.update.bind(r.rig); calls.set(r, 0); t2.set(r, 0); moved.set(r, 0); r.rig.update = (...a) => { calls.set(r, calls.get(r) + 1); return f(...a); }; r._lx = r.pos.x; r._lz = r.pos.z; }
  const N = 1800;   // a minute
  for (let i = 0; i < N; i++) { G.step(1 / 30, 1 / 30); for (const r of CIT()) { if (r.tier === 2) { t2.set(r, t2.get(r) + 1); moved.set(r, moved.get(r) + Math.hypot(r.pos.x - r._lx, r.pos.z - r._lz)); } r._lx = r.pos.x; r._lz = r.pos.z; } }
  const rows = CIT().map((r) => ({ id: r.def.id, abstractFrames: t2.get(r), calls: calls.get(r), moved: Math.round(moved.get(r)) }));
  const out = { stats: { ...W.stats }, msPerFrame: +(W.stats.ms / N).toFixed(3), rows };
  W.measure = false; return out; });
const abs = lod.rows.filter((r) => r.abstractFrames > 1700);
check('residents far from Twinsen and out of view are in the abstract state (their rigs never animate) and still go about their round', abs.length >= 5 && abs.every((r) => r.calls < 20) && abs.reduce((a, r) => a + r.moved, 0) >= 40, lod.rows);
console.log('NOTE one minute at the quay, ten residents (most far off or out of view): ' + lod.msPerFrame + ' ms per frame; steps full/reduced/abstract: ' + JSON.stringify(lod.stats));
check('the whole population costs under 1.0 ms a frame while most are far off', lod.msPerFrame < 1.0, lod.msPerFrame);

// ---- never on a story person or a doorway for long
const clear = await ev(() => { const G = game, W = G.walkers; W.force = 0;
  const g = CIT().find((r) => r.def.id === 'garrick');
  for (const o of CIT()) if (o !== g) o.away = 'test';
  g.reset(); G.step(0.2); g.ri = 0; g.slotAt(g.stops[0]); g.arrived(g.stops[0], true); g.tmr = 60;   // tending a bed, for a minute
  const tim = G.npcs.find((n) => n.def.id === 'tim'), t0 = [tim.pos.x, tim.pos.z];
  tim.pos.set(g.pos.x + 0.5, g.pos.y, g.pos.z); G.step(0.1, 1 / 30);   // a story person right beside him (as a chapter might put one)
  let left = null; for (let t = 0; t < 14; t += 0.1) { G.step(0.1, 1 / 30); if (g.st !== 'dwell') { left = +t.toFixed(1); break; } }
  tim.pos.set(t0[0], tim.pos.y, t0[1]); tim.sync();
  // and at a doorway: put him on his own front doorstep's door point, dwelling: he must go on within the same time
  g.reset(); G.step(0.2); g.ri = 0; g.slotAt(g.stops[0]); g.arrived(g.stops[0], true); g.tmr = 60;
  const d = W.doors[0]; g.pos.set(d.x + 0.5, g.pos.y, d.z); G.step(0.1, 1 / 30);
  let left2 = null; for (let t = 0; t < 14; t += 0.1) { G.step(0.1, 1 / 30); if (g.st !== 'dwell') { left2 = +t.toFixed(1); break; } }
  for (const o of CIT()) o.away = null; W.force = null;
  return { besideStoryPerson: left, onDoorway: left2, log: g.log.slice(-3) }; });
check('a resident standing beside a story person, or on a doorway, for more than 5 s makes room and moves on (never blocks them for long)', clear.besideStoryPerson != null && clear.besideStoryPerson > 4.5 && clear.besideStoryPerson < 7.5 && clear.onDoorway != null && clear.onDoorway > 4.5 && clear.onDoorway < 7.5, clear);

// ---- the story: the evacuation takes them off the streets, gives them back
const evac = await ev(() => { const G = game, W = G.walkers, st = G.story; const f = G.flags;
  const here = () => CIT().filter((r) => r.present).length;
  const before = here();
  f.chapterKey = 'evacuation'; f.chapter = st.chapters.findIndex((c) => c.key === 'evacuation'); st.refreshCast(); const during = here();
  f.chapterKey = 'project'; f.chapter = st.chapters.findIndex((c) => c.key === 'project'); st.refreshCast(); const after = here();
  G.step(2, 1 / 30);
  return { before, during, after, errs: 0 }; });
check('in the evacuation the streets are empty; after it the residents are back', evac.during === 0 && evac.after >= 9 && evac.before >= 9, evac);
// ---- the other areas: Zeelich's street and Kesh (built when first needed: until then their residents wait, hidden)
const AREAS = [
  { name: 'Zeelich\'s street', room: 'zeelich', ox: 2400, ids: ['ilo', 'aven', 'kira'], level: 6.0 },
  { name: 'Kesh', room: 'desert', ox: 3400, ids: ['safi', 'tamu', 'bashir'], level: null },
];
for (const A of AREAS) {
  const z = await ev(async ([room, ids]) => { const G = game, W = G.walkers, nav = W.nav, P = G.physics;
    const find = () => ids.map((id) => W.res.find((x) => x.def.id === id));
    const waiting = find().map((r) => [r.present, r.stops.length]);
    await G.regions.buildAsync([room], 'test', async () => {});
    G.enterRoom(room, null, true, true); G.step(1.0);
    const res = find();
    const out = { waiting, arrived: res.map((r) => [r.present, r.stops.length, !!r.def.pending]) };
    const places = window.storyPlaces(), doors = window.storyDoors(), bad = [];
    for (const r of res) for (const s of r.stops) {
      if (!nav.nearest(s.x, s.z, 0.01)) bad.push(`${s.id}: not walkable`);
      if (!s.door) for (const d of doors) if (Math.hypot(d.x - s.x, d.z - s.z) < d.r + 0.9) bad.push(`${s.id}: on a story door`);
      if (!s.seat) for (const q of places) if (Math.hypot(q.x - s.x, q.z - s.z) < 1.0) bad.push(`${s.id}: within 1 m of ${q.id}'s place (${(q.x).toFixed(1)}, ${q.z.toFixed(1)})`);
    }
    for (const r of res) for (let i = 0; i < r.stops.length; i++) { const a = r.stops[i], b = r.stops[(i + 1) % r.stops.length], j = nav.planSync(a, b, { key: `${r.def.id}:${a.id}>${b.id}` }); if (!j.ok) bad.push(`no route ${a.id}>${b.id}`); }
    out.bad = bad; out.places = places.length;
    const story0 = G.npcs.filter((n) => !n.ambient && n.present).map((n) => [n.def.id, n.pos.x, n.pos.z]);
    // two minutes of their round in full: ground level, colliders, distance
    W.force = 0; for (const o of W.res) if (!res.includes(o)) o.away = 'test';
    const S = {}; for (const r of res) S[r.def.id] = { dist: 0, lx: r.pos.x, lz: r.pos.z, inCol: 0, stops: new Set(), seated: 0, yMin: 99, yMax: -99, carried: new Set(), inside: 0 };
    for (let t = 0; t < 200; t += 0.5) { G.step(0.5, 1 / 30);
      for (const r of res) { const q = S[r.def.id]; q.dist += Math.hypot(r.pos.x - q.lx, r.pos.z - q.lz); q.lx = r.pos.x; q.lz = r.pos.z; q.stops.add(r.stop.id); if (r.st === 'seated') q.seated++; if (r.st === 'inside') q.inside++; if (r.carrying) q.carried.add(r.carrying);
        if (r.present && r.st !== 'inside') { q.yMin = Math.min(q.yMin, r.pos.y); q.yMax = Math.max(q.yMax, r.pos.y); }
        if (r.present && ['walk', 'dwell', 'plan'].includes(r.st)) for (const c of P.near(r.pos.x, r.pos.z)) if (c.enabled && c.top > r.pos.y + 0.55 && c.bottom < r.pos.y + 1.6 && P._inside(c, r.pos.x, r.pos.z, 0.05)) { q.inCol++; break; } } }
    out.sim = Object.fromEntries(Object.entries(S).map(([id, q]) => [id, { dist: Math.round(q.dist), stops: q.stops.size, inCol: q.inCol, seated: q.seated, inside: q.inside, y: [+q.yMin.toFixed(2), +q.yMax.toFixed(2)], carried: [...q.carried] }]));
    out.gave = res.map((r) => r.log.filter((l) => /gave|no route|timed/.test(l)).length);
    out.storyMoved = story0.filter(([id, x, z]) => { const n = G.npcs.find((q) => q.def.id === id); return Math.hypot(n.pos.x - x, n.pos.z - z) > 1e-6; }).map((q) => q[0]);
    for (const o of W.res) o.away = null; W.force = null;
    return out; }, [A.room, A.ids]);
  check(`${A.name}: its three residents wait hidden until the area is built, then start their rounds there`, z.waiting.every(([p, n]) => !p && n === 0) && z.arrived.every(([p, n, pend]) => p && n >= 3 && !pend), z);
  check(`${A.name}: every stop is walkable and over a metre from every place a chapter puts anyone; every leg has a route`, z.bad.length === 0, z);
  const ids2 = Object.keys(z.sim);
  check(`${A.name}: in 200 s each walks (≥ 40 m), visits at least 3 stops, never stands inside a collider${A.level != null ? ', and stays at the island\'s level (y ' + A.level + ')' : ''}`,
    ids2.every((i) => z.sim[i].dist >= 40 && z.sim[i].stops >= 3 && z.sim[i].inCol === 0 && (A.level == null || (Math.abs(z.sim[i].y[0] - A.level) < 0.3 && Math.abs(z.sim[i].y[1] - A.level) < 0.3))) && z.gave.every((n) => n === 0), z.sim);
  check(`${A.name}: the story's people there have not moved`, z.storyMoved.length === 0, z.storyMoved);
}

await shot('walkers-final');

// ---- nothing else: no page errors
check('no page errors in the whole run', errs.length === 0, errs);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
