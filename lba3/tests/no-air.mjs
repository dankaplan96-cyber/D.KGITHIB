// NO-AIR (the user, 10.11.2026: "in the whole game, don't do things in the air"): nobody's hands work on nothing.
// A sweep over every person the game places, in every chapter (and the chapter states that change who is where), in
// every area and room that has people:
//   - who: every NPC of game.npcs — the story's people where their chapter puts them (a placement's pose), the people
//     of the cast rounds (castrounds.js) and the household rounds (roomlife.js) at each of their stops, every resident
//     (walkers.js: Citadel's, the story residents', the islands', the rooms' and the ports') at each stop of the round
//     their state gives them, and the room people who walk a track (hamlife.js, isleslife.js, deeplife.js: played for
//     TRACK_S seconds, since a track's walk ends within half a metre of its spot)
//   - what: the hand actions (WORK below). For each, the working hand's least distance, over the action, from its wrist,
//     palm, fingertips or the tool it holds to the nearest drawn surface that is not the person's own body
//     (tests/lib/contact.js: exact, against the triangles on screen), and both soles' height over the ground
//   - an offender: a hand farther than HAND m from anything, or a standing foot more than FOOT m off the ground
// 'wipe' (hands dried on the apron) is the body's own surface: listed, not measured against the world.
// ISO: each chapter state is set by its flags (as tests/cast-rounds.mjs), the hero is put by each person measured, and
// each stop's pose is played on the person's own rig at the stop (their place and facing there), not walked to.
// Output: one OFFENDER line each (who, where, action, distance), MEASURE lines with the counts. ONLY=<regexp> on
// "chapter/scene/who"; LIST=1 prints every case; STATES=0,1,5 runs those states only (their index below); NOAIR_OUT=<file>
// appends every measured case as a JSON line (a long sweep can be run in parts). GAME_URL (default
// http://localhost:8123/). Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const { check, done } = checker();
let browser, page;
const ev = (f, a) => page.evaluate(f, a);
const measure = (name, info) => console.log('MEASURE ' + name, JSON.stringify(info));
const HAND = +(process.env.HAND || 0.05), FOOT = 0.06, TRACK_S = 64;
const ONLY = process.env.ONLY || '';
const SEL = process.env.STATES ? process.env.STATES.split(',').map(Number) : null;

// chapter states: the chapter's start, and the flags that move people or change what stands at their stops
// (castrounds.js `when`, storylife.js / hamlife.js / ihomes.js phases)
const STATES = [
  ['well', {}], ['project', {}], ['project', { c1_water: true, c1_veskGone: true }],
  ['zeelich', {}], ['zeelich', { c2_shield: true }],
  ['dig', {}], ['dig', { c4_ilka: true, c4_notebook: true, c4_seals3: true }],
  ['steam', {}], ['steam', { c5_planned: true }], ['steam', { c5_planned: true, c5_vent: true, c5_ferryTaken: true, c5_glider: true }],
  ['pass', {}], ['pass', { c6_trip1: true }], ['pass', { c6_trip1: true, c6_trip2: true, c6_up: true, c6_thawed: true }],
  ['observatory', {}], ['evacuation', {}], ['council', {}], ['council', { c9_heard: true }],
  ['network', {}], ['shell', {}], ['core', {}], ['home', {}],
];

// a fresh page every PER states: with every area built and visited the page grows (a 15-state run ran out of memory)
const PER = +(process.env.PER || 3);
const session = async () => {
if (browser) await browser.close();
({ browser, page } = await launch({ width: 960, height: 540 }));
page.setDefaultTimeout(1800000);
await open(page, '?nocine'); await menu(page, 'new');
await page.addScriptTag({ path: fileURLToPath(new URL('./lib/contact.js', import.meta.url)) });
return ev(async () => {
  const RL = await import('./src/game/roomlife.js'), RG = await import('./src/game/regions.js'), WH = await import('./src/game/workhands.js');
  Object.assign(window, { RL, RG, WH });
  const G = game; P.settle();
  window.BASE = JSON.parse(JSON.stringify(G.flags));
  const t0 = performance.now();
  G.regions.ensureAll('test');   // (every area and room: the sweep visits each that has people)
  G.story.applyFlags(); G.step(0.2);
  window.setChapter = (key, extra = {}) => {
    const f = G.flags; P.settle();
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: key !== 'well', intro: true, chapterKey: key, c1_water: key !== 'project', c1_done: true }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.step(0.2);
  };
  const V3 = G.hero.pos.constructor;
  // the hand actions: which hand must be on something (req), and how the action runs (a loop: sampled once settled; a
  // one-off move, `shot` seconds long: sampled all through, the contact is its lowest / farthest point)
  const WORK = (window.WORK = {
    tinker: { req: ['R', 'L'] }, kneelWork: { req: ['R', 'L'] }, potting: { req: ['R', 'L'] }, search: { req: ['R', 'L'] }, use: { req: ['R', 'L'] },
    pump: { req: ['R', 'L'] }, pumpGrip: { req: ['R', 'L'] }, reach: { req: ['R'] }, tapTurn: { req: ['R'] }, touchWater: { req: ['R'] }, door: { req: ['R'] },
    setDown: { req: ['R'], shot: 1.2 }, pickup: { req: ['R'], shot: 0.95 }, reachHigh: { req: ['R'], shot: 1.3 },
    wipe: { self: true },
  });
  const NA = (window.NA = {});
  // which scene a place is in: an interior or an outdoor area (the nearest room centre that owns it), else Citadel
  NA.sceneAt = (x, z) => {
    let best = null, bd = Infinity;
    for (const [id, R] of Object.entries(G.rooms)) {
      const c = R?.center || R?.group?.position; if (!c) continue;
      const d = Math.hypot(x - c.x, z - c.z), lim = R.outdoor ? (R.radius || 320) : 60;
      if (d < lim && d < bd) { bd = d; best = id; }
    }
    return best || 'citadel';
  };
  NA.go = (scene, x, z) => {
    const h = G.hero, here = G.room?.id ?? 'citadel';
    if (here !== scene) {
      if (scene === 'citadel') G.exitRoom({ x, z, a: 0 }, true, true);
      else G.enterRoom(scene, null, true, true);
      G.story.refreshCast(); G.step(0.3); P.settle();
    }
    const R = G.room;
    if (!R || R.outdoor) { h.pos.set(x, G.physics.groundAt(x, z), z); h.onGround = true; h.vy = 0; if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.2); P.settle(); }
    return G.room?.id ?? 'citadel';
  };
  const RS = () => G.story.interiors?.rounds;
  // every hand-work case of the state the game is in: { who, kind, stop, x, z, a, anim, scene, y? }
  NA.cases = () => {
    const out = []; let stopAct = null; const add = (n, kind, stop, x, z, a, anim, y) => { if (WORK[anim]) out.push({ who: n.def.id, kind, stop, x, z, a: a ?? n.angle, anim, y, scene: (n.def.indoor && G.rooms[n.def.room]) ? n.def.room : (n.def.ambient && n.def.area && (n.def.area === 'citadel' || G.rooms[n.def.area])) ? n.def.area : NA.sceneAt(x, z), act: stopAct }); };
    for (const n of G.npcs) {
      if (!n.rig?.j?.armR?.hand) continue;
      if (n.stops) {   // a resident: the round of its state
        if (n.away === 'story' || !n.stops.length) continue;
        for (const s of n.stops) if (!s.seat) {
          stopAct = s.act;
          // (a door: the knock is made after the last step up to the leaf — walkers.js knockTick — so from there)
          const k = s.door && s.act !== 'noknock' ? WH.workSpot(G, s.x, s.z, s.a, 'tapTurn', { y: G.physics.groundAt(s.x, s.z, (s.y ?? 1e9) + 0.4), max: 1.7, r: 0.3 }) : null;
          add(n, 'round', s.id, k ? k.x : s.x, k ? k.z : s.z, s.a, s.door ? 'tapTurn' : n.actAnim(s), s.y);
        }
        stopAct = null;
        continue;
      }
      if (!n.present) continue;
      if (n.track?.cmds?.length) { let an = n.forceAnim, at = null, i = 0; for (const c of n.track.cmds) { if (c.op === 'call') { const d = {}; try { c.fn(d); } catch { /* (not a pose) */ } if ('forceAnim' in d) an = d.forceAnim; } else if (c.op === 'anim') an = c.name; else if (c.op === 'goto') at = c; else if (c.op === 'face' && at) add(n, 'track', 't' + i++, at.x, at.z, c.a, an, n.pos.y); } if (out.some((c) => c.who === n.def.id && c.kind === 'track')) continue; }
      add(n, 'placed', 'mark', n.pos.x, n.pos.z, n.angle, n.forceAnim, n.pos.y);
    }
    return out;
  };
  // the rounds of the story's own people (cast rounds in the area the hero is in; the household rounds): their stops
  NA.roundCases = () => {
    const out = [], R = RS(); if (!R) return out;
    for (const n of G.npcs) {
      if (n.stops || !n.present) continue;
      let D = null; try { D = R.defFor(n); } catch { D = null; }
      if (!D) continue;
      let stops = null;
      try { if (D.ch) stops = n.placed ? RL.castStops(G, D, n.placed, R.castNav(D)) : null; else { const room = G.regions.built(D.room); if (room && G.room === room && R.onMark(D, n.placed || { x: n.pos.x, z: n.pos.z, anim: n.forceAnim })) stops = R.stops(D, room); } } catch { stops = null; }
      for (const s of stops || []) { if (s.mark) continue; if (WORK[s.act]) out.push({ who: n.def.id, kind: 'cast', stop: s.id, x: s.x, z: s.z, a: s.a, anim: s.act, y: n.pos.y, scene: G.room?.id ?? 'citadel' }); }   // (the rounds play the rig's pose of the act's own name: roomlife.js dwell)
    }
    return out;
  };
  // one case: the pose played on the person's own rig at the place; the least hand gap over the action, the feet
  NA.pose = (c) => {
    const n = G.npcs.find((x) => x.def.id === c.who), rig = n.rig, W = WORK[c.anim];
    if (c.kind !== 'placed' && WH.standsAt?.(c.who, c.stop)) return { ...c, stood: true, listed: true, x: +c.x.toFixed(2), z: +c.z.toFixed(2), a: +(+c.a).toFixed(2), gap: null, hands: null, feet: null };   // (workhands.js AIR_STOPS: the person stands there)
    const keep = { x: n.pos.x, y: n.pos.y, z: n.pos.z, a: n.angle, vis: rig.root.visible, lod: rig.lodN, par: rig.root.parent, nf: rig.noFidget };
    const indoor = G.room && !G.room.outdoor;
    const y = G.physics.groundAt(c.x, c.z, (c.y ?? (indoor ? G.hero.pos.y : 1e9)) + 0.4);
    n.pos.set(c.x, y, c.z); n.angle = c.a;
    rig.root.visible = true; rig.lodN = 0; rig.noFidget = true; if (!rig.root.parent) G.scene.add(rig.root);
    const dt = 1 / 30, frames = Math.round((W.shot ? W.shot + 0.15 : 2.6) / dt), from = W.shot ? 3 : 36;
    const free = rig.handsFree; rig.handsFree = c.act === 'warm';
    rig.standFor = null; rig.play('idle'); rig.update(dt, 0); rig.play(c.anim);
    const best = { R: { d: 9 }, L: { d: 9 } }; let feet = [0, 0], stood = false;
    G.scene.updateMatrixWorld();
    for (let i = 0; i < frames; i++) {
      rig.root.position.copy(n.pos); rig.root.rotation.y = n.angle;
      rig.play(c.anim); rig.update(dt, 0);
      rig.root.position.copy(n.pos); rig.root.rotation.y = n.angle;
      rig.root.updateMatrixWorld(true);
      if (rig.anim !== c.anim && i > 20) { stood = true; const la = WH.lookAhead ? WH.lookAhead(G, n.pos.x, n.pos.y, n.pos.z, n.angle, rig.root.scale.y || 1) : null; c = { ...c, why: (n._wh?.why || '') + (la ? ` (drawn ahead: a face at ${la.face.map((d) => d ?? '-').join('/')} m, a top ${la.top ? la.top[1] + ' m high at ' + la.top[0] + ' m' : 'nowhere'})` : '') }; break; }   // (stood down: nothing there to work at, workhands.js)
      if (i < from || W.self) continue;
      for (const s of W.req) { const r = CT.handGap(n, s, CT.roots(), 0.8); const d = r.d ?? 0.8; if (d < best[s].d) best[s] = { d, on: r.name, i }; }
      if (i === frames - 1 || (W.shot && i === Math.round(W.shot * 0.45 / dt))) feet = CT.feet(n);
    }
    const out = { ...c, stood, x: +c.x.toFixed(2), z: +c.z.toFixed(2), a: +(+c.a).toFixed(2), gap: W.self || stood ? null : Math.max(...W.req.map((s) => best[s].d)), hands: W.self || stood ? null : Object.fromEntries(W.req.map((s) => [s, [+best[s].d.toFixed(3), best[s].on || '-']])), feet: /^kneel/.test(c.anim) || c.anim === 'pickup' ? null : feet };
    n.pos.set(keep.x, keep.y, keep.z); n.angle = keep.a; rig.root.visible = keep.vis; rig.lodN = keep.lod; rig.noFidget = keep.nf; if (!keep.par) rig.root.parent?.remove(rig.root);
    rig.standFor = null; rig.handsFree = free; rig.play('idle'); rig.root.position.copy(n.pos); rig.root.rotation.y = n.angle;
    return out;
  };
  return { ms: Math.round(performance.now() - t0), rooms: Object.keys(G.rooms).length, npcs: G.npcs.length };
});
};

const rows = [];
let ran = 0, crashes = 0;
const runState = (key, flags) => ev(([key, flags, ONLY, TRACK_S]) => {
    const G = game, only = ONLY ? new RegExp(ONLY) : null, out = [], notes = [];
    setChapter(key, flags);
    const ok = (c) => !only || only.test(`${key}/${c.scene}/${c.who}`) || only.test(key);
    const all = NA.cases();
    const scenes = [...new Set([...all.map((c) => c.scene), ...G.npcs.filter((n) => !n.stops && n.present && n.def.id !== 'hero').map((n) => NA.sceneAt(n.pos.x, n.pos.z))])];
    for (const scene of scenes) {
      const mine = all.filter((c) => c.scene === scene);
      const first = mine[0] || (() => { const n = G.npcs.find((n) => !n.stops && n.present && NA.sceneAt(n.pos.x, n.pos.z) === scene); return n && { x: n.pos.x, z: n.pos.z }; })();
      if (!first) continue;
      let at; try { at = NA.go(scene, first.x, first.z); } catch (e) { notes.push(`${scene}: ${e.message}`); continue; }
      if (at !== scene) { notes.push(`${scene}: the hero is in ${at}`); continue; }
      // the story's people's rounds here (they depend on the hero's area)
      const list = [...mine.filter((c) => c.kind !== 'track'), ...NA.roundCases()].filter(ok);
      for (const c of list) {
        if (!G.room || G.room.outdoor) NA.go(scene, c.x + 3 * Math.sin(c.a + 2.6), c.z + 3 * Math.cos(c.a + 2.6));
        try { out.push(NA.pose(c)); } catch (e) { notes.push(`${c.who} ${c.stop}: ${e.message}`); }
      }
      // the tracks: played
      const tr = mine.filter((c) => c.kind === 'track').filter(ok);
      if (tr.length) {
        const who = [...new Set(tr.map((c) => c.who))].map((id) => G.npcs.find((n) => n.def.id === id));
        const best = new Map();
        for (let i = 0, N = Math.round(TRACK_S * 15); i < N; i++) {
          G.step(1 / 15);
          if (G.state !== 'play') P.settle();
          // (as seen: a person out of the camera's view is posed at a lower rate and without the hands layer — the game's
          //  step leaves the people it does not draw that way; here each one at work is posed once more as the camera's
          //  view of them would have it)
          for (const n of who) if (WORK[n.rig.anim] && n.present) { n.rig.lodN = 0; n.rig.root.visible = true; n.rig.update(1 / 30, 0); }
          if (i % 2) continue;
          G.scene.updateMatrixWorld();
          for (const n of who) {
            const an = n.rig.anim, W = WORK[an]; if (!W || W.self || !n.present) continue;
            const stop = tr.filter((c) => c.who === n.def.id).sort((a, b) => Math.hypot(a.x - n.pos.x, a.z - n.pos.z) - Math.hypot(b.x - n.pos.x, b.z - n.pos.z))[0];
            const k = n.def.id + '|' + stop.stop + '|' + an;
            const b = best.get(k) || { ...stop, anim: an, x: n.pos.x, z: n.pos.z, a: n.angle, n: 0, hands: Object.fromEntries(W.req.map((s) => [s, [9, '-']])), feet: null };
            b.n++; b.x = n.pos.x; b.z = n.pos.z; b.a = n.angle;
            if (b.n > 12 && b.n < 60) { for (const s of W.req) { const r = CT.handGap(n, s, CT.roots(), 0.8), d = r.d ?? 0.8; if (d < b.hands[s][0]) b.hands[s] = [+d.toFixed(3), r.name || '-']; } if (!/^kneel/.test(an)) b.feet = CT.feet(n); }
            best.set(k, b);
          }
        }
        for (const b of best.values()) { if (b.n <= 13) continue; b.gap = Math.max(...Object.values(b.hands).map((h) => h[0])); b.x = +b.x.toFixed(2); b.z = +b.z.toFixed(2); b.a = +b.a.toFixed(2); out.push(b); }
        for (const c of tr) if (![...best.keys()].some((k) => k.startsWith(c.who + '|'))) notes.push(`${c.who}: its track never reached a work pose in ${TRACK_S} s`);
      }
    }
    return { out, notes, scenes, probe: WH.probeStats ? { n: WH.probeStats.n, meanMs: +(WH.probeStats.ms / Math.max(1, WH.probeStats.n)).toFixed(2), worstMs: +WH.probeStats.worstMs.toFixed(1), meanTris: Math.round(WH.probeStats.tris / Math.max(1, WH.probeStats.n)) } : null };
  }, [key, flags, ONLY, TRACK_S]);
for (let si = 0; si < STATES.length; si++) {
  const [key, flags] = STATES[si];
  const tag = key + (Object.keys(flags).length ? '+' + Object.keys(flags).join('+') : '');
  if (SEL && !SEL.includes(si)) continue;
  if (ONLY && !new RegExp(ONLY).test(tag) && !/\//.test(ONLY)) continue;
  const t0 = Date.now();
  let r = null;
  // (a page that dies — the machine out of memory under other work — is started again, once per state)
  for (let go = 0; go < 2 && !r; go++) {
    try { if (go || ran++ % PER === 0) measure('built', await session()); r = await runState(key, flags); }
    catch (e) { crashes++; console.log(`NOTE state ${tag}: the page died (${String(e.message).split('\n')[0]}); ${go ? 'given up' : 'again on a fresh page'}`); ran = 1; }
  }
  if (!r) { check(`state ${tag} was measured`, false, 'the page died twice'); continue; }
  if (process.env.NOAIR_OUT) fs.appendFileSync(process.env.NOAIR_OUT, r.out.map((o) => JSON.stringify({ state: tag, ...o })).join('\n') + '\n');
  for (const o of r.out) { rows.push({ state: tag, ...o }); if (o.gap != null && o.gap > HAND) console.log(`  air ${o.scene} ${o.who} @${o.stop} ${o.anim} ${(o.gap * 100).toFixed(1)} cm`); }
  console.log(`STATE ${tag}: ${r.out.length} cases in ${r.scenes.length} scenes, ${Math.round((Date.now() - t0) / 1000)} s` + (r.probe ? ` probes ${JSON.stringify(r.probe)}` : '') + (r.notes.length ? ' NOTES ' + JSON.stringify(r.notes.slice(0, 12)) : ''));
}

// one line per distinct case (the same person at the same stop in several chapter states: the worst)
const byKey = new Map();
for (const r of rows) {
  const k = `${r.scene}|${r.who}|${r.stop}|${r.anim}|${Math.round(r.x)}|${Math.round(r.z)}`;
  const p = byKey.get(k);
  if (!p) byKey.set(k, { ...r, states: [r.state] }); else { p.states.push(r.state); if ((r.gap ?? 0) > (p.gap ?? 0)) Object.assign(p, { gap: r.gap, hands: r.hands, feet: r.feet, state: r.state, stood: false }); }
}
const cases = [...byKey.values()];
const footBad = (c) => c.feet && c.feet.some((h) => Math.abs(h) > FOOT);
// ('warm': a hand held out to a heat post's warmth, not on it: listed, not an offender)
const warm = cases.filter((c) => c.act === 'warm');
const air = cases.filter((c) => c.gap != null && c.gap > HAND && c.act !== 'warm'), feet = cases.filter(footBad), self = cases.filter((c) => c.gap == null && !c.stood);
// (stood: the game found nothing in reach for the action and has the person stand there instead: listed, not an offender)
const stood = cases.filter((c) => c.stood);
for (const c of stood) console.log(`STOOD ${c.scene} ${c.who} @${c.stop} (${c.x}, ${c.z}) ${c.anim}${c.why ? ': ' + c.why : ''} [${c.states[0]}]`);
const line = (c) => `${c.scene} ${c.who} @${c.stop} (${c.x}, ${c.z}) ${c.anim}: ${c.stood ? 'stood down' : c.hands ? Object.entries(c.hands).map(([s, [d, on]]) => `${s} ${(d * 100).toFixed(1)} cm${d < 0.79 ? ' from ' + on : ' (nothing in reach)'}`).join(', ') : 'own body'}${c.feet ? ` feet ${c.feet.map((h) => (h * 100).toFixed(1)).join('/')} cm` : ''} [${c.states[0]}${c.states.length > 1 ? ' +' + (c.states.length - 1) : ''}]`;
if (process.env.LIST) for (const c of cases) console.log('CASE ' + line(c));
for (const c of air.sort((a, b) => b.gap - a.gap)) console.log('OFFENDER hand ' + line(c));
for (const c of feet) console.log('OFFENDER feet ' + line(c));
const byAnim = {}; for (const c of cases) { const a = (byAnim[c.anim] ||= [0, 0]); a[0]++; if (c.gap != null && c.gap > HAND) a[1]++; }
measure('cases', { states: SEL ? SEL.length : STATES.length, pagesDied: crashes, measured: rows.length, distinct: cases.length, byAnim, ownBody: self.length, warming: warm.length, stoodDown: stood.length, onAThing: cases.filter((c) => c.gap != null && c.gap <= HAND).length, handLimitCm: HAND * 100, footLimitCm: FOOT * 100 });
measure('offenders', { hands: air.length, feet: feet.length, worstCm: air[0] ? +(air[0].gap * 100).toFixed(1) : 0 });
check('the sweep found the people at work (hundreds of stops over the chapters; a part of it — STATES, ONLY — its share)', ONLY ? cases.length > 0 : SEL ? cases.length > 40 * Math.min(3, SEL.length) : cases.length > 150, { distinct: cases.length });
check(`no hand works on air: every working hand within ${HAND * 100} cm of a real surface at its contact`, air.length === 0, air.slice(0, 12).map(line));
check(`feet on the ground: every standing worker's soles within ${FOOT * 100} cm of it`, feet.length === 0, feet.slice(0, 12).map(line));
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
