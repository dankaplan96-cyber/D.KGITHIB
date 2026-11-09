// PEOPLE-1 (src/game/islandlife.js, src/game/story/islandpeople.js): the people of Zeelich's islands. Played on the real
// game with deterministic stepping (game.step); each chapter state is set by its flags (ISO lines say so), the hero put on
// the island by enterRoom (ISO). For every island in each of the three states (chapters 4–7, the council's chapter 9, the
// epilogue):
//   - count: 4–8 residents there (Otringal with its bar and hotel), in the state the chapter says
//   - stops: every stop on the planner's ground and 1.5 m or more from a door, an exit, a prompt and a ball target
//   - 20 s of free play: each one moves; none dwells within 1.5 m of a door or a prompt; no collider overlap; no flags
// and once each: away from their island they sleep (no update, not moved); a talk stops a walking one and turns it to
// Twinsen, and it goes on afterwards (STAGED: story.talk); a crowd at Otringal's hotel door does not block the way in
// (INPUT); each island's meaning by input (walk, E, the shop panel, the ball); a save and a reload (INPUT: Quit,
// Continue) brings back the islands' flags (only pp_ ones are new) and the residents.
// Cost: the residents' update per 0.1 s step (CPU, SwiftShader container: no fps), and the draw calls and triangles
// Otringal's plaza people add to one frame.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, context, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
await open(page, '?nocine'); await menu(page, 'new');

const install = () => ev(async () => {
  const IL = await import('/src/game/islandlife.js'), RG = await import('/src/game/regions.js');
  Object.assign(window, { IL, RG });
  window.BASE ||= JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.step(0.2);
  };
  window.heroTo = (room, x, z, a = 0) => {
    const G = game, h = G.hero;
    if (room === 'zeelich' && x == null) { G.enterRoom('zeelich', G.rooms.zeelich.dock, true, true); }
    else G.enterRoom(room, x != null ? { x, z, a } : null, true, true);
    if (x != null) { h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; }
    h.onGround = true; h.vy = 0; if (G.camRig.lba) G.camRig.lba.init = false;
    G.story.refreshCast(); G.step(0.4); P.settle();
    return G.room?.id;
  };
  window.ppl = (area) => game.npcs.filter((n) => n.def.area === area || (area === 'isle_otringal' && ['otrbar', 'otrhotel'].includes(n.def.room)));
  window.here = (area) => ppl(area).filter((n) => n.stops.length && n.away !== 'story' && (n.present || n.inside) && (n.def.indoor ? n.def.room : n.def.area) === game.room?.id);
  window.prompts = () => {
    const G = game, out = []; let last = null;
    const dist = (x, z) => { last = { x, z }; return 0; };
    const consider = (d, r, it) => { if (last) out.push({ x: last.x, z: last.z, r, kind: it.kind }); };
    try { G.story.interactables(consider, dist); G.story.chapters[0].baseInteractables(consider, dist, G.story.cur); } catch (e) { out.push({ err: String(e) }); }
    // (ISLES-BAR: the islands' usable pieces, story/isleslife.js il_item, are where some residents work (a stall's keeper, the
    //  great hive's keeper): their prompt gives way to a person beside him, so a stop by one is not a stop on a prompt)
    return out.filter((p) => p.x != null && !/^npc/.test(p.kind) && p.kind !== 'il_item');
  };
  window.spots = () => {
    const G = game, R = G.room, out = [], near = (p) => Math.hypot(p.x - G.hero.pos.x, p.z - G.hero.pos.z) < 120;
    for (const d of G.story.doors()) if (near(d) && (d.region || 'citadel') === R?.id) out.push({ x: d.x, z: d.z, what: 'door ' + (d.room || '') });
    for (const e of R?.exits || []) out.push({ x: e.x, z: e.z, what: 'exit ' + e.to });
    for (const d of R?.shutDoors || []) if (near(d)) out.push({ x: d.x, z: d.z, what: 'house door' });
    for (const p of prompts()) if (near(p)) out.push({ x: p.x, z: p.z, what: 'prompt ' + p.kind });
    for (const b of R?.ballTargets || []) if (near(b)) out.push({ x: b.x, z: b.z, what: 'ball target' });
    if (R?.pad) out.push({ x: R.pad.x, z: R.pad.z, what: 'shuttle pad', r: 3.0 });
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
  window.stopCheck = (ns) => {
    const sp = spots(), out = {};
    for (const n of ns) {
      const bad = [], nav = n.W.nav;
      for (const s of n.stops) {
        const c = nav.nearest(s.x, s.z, 1);
        if (!c || Math.hypot(c.x - s.x, c.z - s.z) > 0.6) bad.push(`${s.id}: no ground there`);
        if (s.door) continue;
        for (const p of sp) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < (p.r || 1.5)) bad.push(`${s.id} ${d.toFixed(2)} m from ${p.what}`); }
      }
      out[n.def.id] = { phase: n.phaseKey ?? 'room', bad };
    }
    return out;
  };
  window.freePlay = (ns, secs = 20) => {
    const G = game, sp = spots(), out = { people: {} }, f0 = JSON.stringify(G.flags);
    const W = [G.walkers, G.roomWalkers].filter(Boolean);
    for (const w of W) { w.measure = true; w.stats.ms = 0; }
    const rec = new Map();
    for (const n of ns) rec.set(n, { moved: 0, prev: [n.pos.x, n.pos.z], stops: new Set([n.stop?.id]), near: new Set(), hits: new Set(), tmr0: n.tmr });
    const frames = secs * 10;
    for (let i = 0; i < frames; i++) {
      G.step(0.1);
      for (const n of ns) {
        const r = rec.get(n);
        r.moved += Math.hypot(n.pos.x - r.prev[0], n.pos.z - r.prev[1]); r.prev = [n.pos.x, n.pos.z];
        r.stops.add(n.stop?.id);
        if (['dwell', 'pairwait', 'chat'].includes(n.st) && !n.stop?.door && n.present) for (const p of sp) { const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z); if (d < (p.r || 1.5)) r.near.add(`${n.stop?.id} ${d.toFixed(2)} m from ${p.what}`); }
        if (i % 5 === 0 && n.present) for (const h of colliderHits(n)) r.hits.add(h);
      }
    }
    for (const n of ns) { const r = rec.get(n); out.people[n.def.id] = { moved: +r.moved.toFixed(1), stops: [...r.stops], tmr0: +r.tmr0.toFixed(1), near: [...r.near].slice(0, 3), hits: [...r.hits].slice(0, 2), rescues: n.rescues, log: n.log.slice(-3) }; }
    out.msPerFrame = +(W.reduce((a, w) => a + w.stats.ms, 0) / frames).toFixed(4);
    for (const w of W) w.measure = false;
    out.flagsSame = JSON.stringify(G.flags) === f0; out.state = G.state;
    return out;
  };
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
// every island is built (as the shuttle would build it, through the game's own path) and the bar and hotel
await ev(() => { game.regions.ensureAll('test'); });
const ISLES = await ev(() => Object.keys(IL.ISLE_PEOPLE));
const cost = [];

async function island(label, name, want) {
  const area = 'isle_' + name;
  await ev((a) => heroTo(a), area);
  const rooms = name === 'otringal' ? ['otrbar', 'otrhotel'] : [];
  const pre = await ev(([area, want]) => {
    const ns = here(area);
    return { n: ns.length, wrong: ns.filter((n) => n.phaseKey !== want).map((n) => n.def.id + ':' + n.phaseKey), stops: stopCheck(ns), ids: ns.map((n) => n.def.id) };
  }, [area, want]);
  let total = pre.n;
  const fp = await ev((a) => freePlay(here(a), 20), area);
  for (const r of rooms) {
    await ev((r) => heroTo(r), r);
    const q = await ev((r) => { const ns = here('isle_otringal'); return { n: ns.length, stops: stopCheck(ns), fp: freePlay(ns, 20) }; }, r);
    total += q.n;
    for (const [id, s] of Object.entries(q.stops)) if (s.bad.length) check(`${label}, ${r}, ${id}: stops clear`, false, s);
    for (const [id, p] of Object.entries(q.fp.people)) if (p.near.length || p.hits.length || !(p.moved > 0.3 || p.stops.length > 1 || p.tmr0 > 18)) check(`${label}, ${r}, ${id}: moves, keeps clear, no overlap`, false, p);
  }
  check(`${label}, ${name}: ${total} residents (4–8)${want ? ` in the state '${want}'` : ''}`, total >= 4 && total <= 8 && !pre.wrong.length, pre);
  const bad = Object.entries(pre.stops).filter(([, s]) => s.bad.length);
  check(`${label}, ${name}: every stop on the ground, clear of doors, exits, prompts, ball targets and the pad`, !bad.length, bad);
  const still = Object.entries(fp.people).filter(([, p]) => !(p.moved > 0.5 || p.stops.length > 1 || p.tmr0 > 18) || p.near.length || p.hits.length);
  check(`${label}, ${name}: 20 s of free play: each moves, none dwells by a door or prompt, no overlap, nothing saved`, !still.length && fp.flagsSame && fp.state === 'play', { still, flagsSame: fp.flagsSame });
  cost.push({ label: `${label} ${name}`, n: total, ms: fp.msPerFrame });
}

// ---------------------------------------------------------------- the three states
await ev(() => setChapter('dig', { c4_started: true }));
iso('chapter 4 (ordinary life): set by its flags');
for (const n of ISLES) await island('chapter 4', n, 'ord');
await ev(() => setChapter('council', { c2_shield: true, c9_started: true }));
iso('chapter 9 (the council: the crisis state): set by its flags');
for (const n of ['otringal', 'knartas', 'platform', 'oldwatch']) await island('chapter 9', n, 'crisis');
await ev(() => setChapter('home', {}));
iso('the epilogue (after): set by its flags');
for (const n of ['otringal', 'celebration', 'liftdock']) await island('epilogue', n, 'after');
// (ISLES-BAR: Mila waits by the radio for letters from Twinsun at home in chapters 8-9: story/isleslife.js; four outdoors)
const ev8 = await ev(() => { setChapter('evacuation', {}); heroTo('isle_knartas'); return { n: here('isle_knartas').length, ph: here('isle_knartas').map((n) => n.phaseKey), mila: game.story.islife.atHome().includes('il_mila') }; });
check('chapter 8 (the evacuation is Twinsun\'s): Knartas\'s people are still at home, in the crisis state (Mila indoors by the radio)', ev8.n === 4 && ev8.mila && ev8.ph.every((p) => p === 'crisis'), ev8);
const ch3 = await ev(() => { setChapter('zeelich', {}); heroTo('isle_mosquibee'); return here('isle_mosquibee').length; });
check('before chapter 4 (the shuttle does not fly there): nobody on the islands', ch3 === 0, ch3);

// ---------------------------------------------------------------- sleep, talk, a crowded door
await ev(() => setChapter('dig', { c4_started: true }));
const sl = await ev(() => {
  heroTo('zeelich'); const ns = ppl('isle_mosquibee'), p0 = ns.map((n) => [n.pos.x, n.pos.z]);
  for (let i = 0; i < 100; i++) game.step(0.1);
  return { away: ns.map((n) => n.away), moved: ns.map((n, k) => +Math.hypot(n.pos.x - p0[k][0], n.pos.z - p0[k][1]).toFixed(3)) };
});
check('the hero on Zeelich: Mosquibee\'s residents sleep (no update) and stay where they were', sl.away.every((a) => a === 'sleep') && sl.moved.every((d) => d === 0), sl);
const tk = await ev(() => {
  const G = game, h = G.hero; heroTo('isle_liftdock');
  const n = G.npcs.find((q) => q.def.id === 'ld_load1');
  for (let i = 0; i < 300 && n.st !== 'walk'; i++) G.step(0.1);
  const walking = n.st === 'walk';
  h.pos.set(n.pos.x + 1.2, h.pos.y, n.pos.z); G.step(0.05);
  const p0 = [n.pos.x, n.pos.z]; G.story.talk(n);
  for (let i = 0; i < 20; i++) G.step(0.05);
  const dA = Math.abs(Math.atan2(Math.sin(n.angleTo(h) - n.angle), Math.cos(n.angleTo(h) - n.angle)));
  const o = { walking, state: G.state, engaged: n.engaged, drift: +Math.hypot(n.pos.x - p0[0], n.pos.z - p0[1]).toFixed(3), facing: +dA.toFixed(2) };
  // (walked away from mid-talk: the line is closed by Escape, as a player would)
  P.tap('Escape', 0.1); P.settle(); h.pos.set(h.pos.x + 8, h.pos.y, h.pos.z); G.step(0.2);
  const p1 = [n.pos.x, n.pos.z]; for (let i = 0; i < 150; i++) G.step(0.1);
  o.after = G.state; o.walkedOn = +Math.hypot(n.pos.x - p1[0], n.pos.z - p1[1]).toFixed(2); o.engagedAfter = n.engaged;
  return o;
});
check('the Lift Dock, a loader spoken to while walking (STAGED talk): it stops and turns to Twinsen; cut short, it goes on', tk.walking && tk.state === 'dialog' && tk.engaged && tk.drift < 0.05 && tk.facing < 0.35 && tk.after === 'play' && !tk.engagedAfter && tk.walkedOn > 0.3, tk);
const door = await ev(() => {
  const G = game; heroTo('isle_otringal');
  const po = G.npcs.find((q) => q.def.id === 'ot_porter'); po.ri = 0; po.leave?.();
  for (let i = 0; i < 400 && !(po.stop?.door && po.st !== 'walk'); i++) G.step(0.1);
  const r = P.enter('otrhotel'); const inRoom = G.room?.id;
  heroTo('isle_otringal');
  return { r: r.r, inRoom, porter: po.stop?.id, st: po.st };
});
check('Otringal: with the porter at the hotel\'s door, Twinsen still walks in (INPUT)', door.inRoom === 'otrhotel', door);

// ---------------------------------------------------------------- each island's meaning, by input
const coins = (n) => ev((n) => { game.hero.coins = n; }, n);
await coins(200);
// Otringal: the hotel's machines
const mach = await ev(() => {
  const G = game, h = G.hero; heroTo('isle_otringal'); P.enter('otrhotel');
  h.hp = 1;
  return { room: G.room?.id };
});
const machUse = await ev(async () => {
  const { HOTEL } = await import('/src/game/otrhotel.js');
  const G = game, h = G.hero, life = HOTEL.machines.find((q) => q.kind === 'life'), c0 = h.coins;
  const r = P.use(life.x, life.z, { kind: 'ip_machine' });
  return { r: r.r, hp: h.hp, max: h.maxHp, paid: c0 - h.coins };
});
check('Otringal, the Imperial Hotel: the life machine (INPUT: walk, E) refills life for 5 kashes', mach.room === 'otrhotel' && machUse.hp === machUse.max && machUse.paid === 5, { mach, machUse });

// Mosquibee + the Orchard: Bzzra's hives, the beacon by the ball, the royal honey
const bz = await ev(() => {
  const G = game; heroTo('isle_mosquibee');
  const t = P.talk('mb_bzzra'); const st = G.state, items = [...document.querySelectorAll('#shop .item')].map((b) => b.textContent);
  document.querySelector('#shop .leave')?.click(); G.step(0.2); P.settle();
  return { t: t.r, shop: st, items, ask: !!G.flags.pp_bzzra };
});
check('Mosquibee: Bzzra (INPUT: talk) tells of the low shuttles and opens her honey stall', bz.ask && bz.shop === 'shop' && bz.items.length === 1, bz);
const bc = await ev(() => {
  const G = game; heroTo('isle_orchard');
  const T = G.rooms.isle_orchard.ballTargets.find((q) => q.onHit && !q.gear);
  const ok = T ? P.hitTarget(T, 5) : false;
  return { ok, lit: !!G.flags.pp_beacon, y: T ? +(T.y - G.hero.pos.y).toFixed(1) : null };
});
check('the Orchard: the beacon on the cloud catcher is lit by the ball (INPUT: walk, throw)', bc.lit, bc);
const rh = await ev(() => {
  const G = game, h = G.hero, f = G.flags; heroTo('isle_mosquibee');
  const c0 = h.coins; P.talk('mb_bzzra'); const shop = G.state; const price = document.querySelector('#shop .item b')?.textContent;
  document.querySelector('#shop .leave')?.click(); G.step(0.2); P.settle();
  const got = f.pp_royal; f.sh_honey = 0; h.hp = 2; for (let i = 0; i < 10; i++) G.step(0.1);
  return { done: !!f.pp_bzzraDone, got, shop, price, healed: h.hp === h.maxHp, left: f.pp_royal, paid: c0 - h.coins };
});
check('Mosquibee: back at Bzzra with the beacon lit: a royal honey (carried) and her honey at 4; when life runs low it heals in full', rh.done && rh.got === 1 && /4$/.test(rh.price || '') && rh.healed && rh.left === 0, rh);
const co = await ev(() => {
  const G = game, h = G.hero; heroTo('isle_orchard'); h.mp = 0; const c0 = h.coins;
  P.talk('or_pell'); const shop = G.state; const r = P.menuPick(0);
  document.querySelector('#shop .leave')?.click(); G.step(0.2); P.settle();
  return { shop, mp: h.mp, max: h.mpMax, paid: c0 - h.coins, state: G.state };
});
check("the Orchard: Pello's nectar cordial (INPUT: talk, buy) refills magic for 4 kashes", co.shop === 'shop' && co.mp === co.max && co.paid === 4 && co.state === 'play', co);

// Celebration: the lantern; Under Celebration: the pointer to the mine
const la = await ev(() => {
  const G = game, A = G.hero.arms; A.lantern = false; heroTo('isle_celebration');
  P.talk('ce_lanterns'); const shop = G.state; P.menuPick(0); P.settle();
  const has = !!A.lantern; P.talk('ce_lanterns'); const after = G.state;
  return { shop, has, after };
});
check('Celebration: Zella sells a lantern (INPUT: talk, buy) when Twinsen has none; then points to the old mine below', la.shop === 'shop' && la.has && la.after === 'play', la);
const ug = await ev(() => {
  const G = game; heroTo('isle_undergas');
  const n = G.npcs.find((q) => q.def.id === 'ug_foreman'); const k = G.story.ipeople.linesFor(n);
  return { keys: k };
});
check('Under Celebration: the gas-works foreman points to the old mine and its dark (a line of his)', ug.keys.includes('ip_ug_foreman_1'), ug);

// the Platform: the chapel bell's clapper
const pf = await ev(() => {
  const G = game, f = G.flags, h = G.hero; heroTo('isle_platform');
  const cl0 = h.clovers; P.talk('pf_chaplain'); const ask = !!f.pp_bellAsk;
  const T = IL.ISLE_THINGS.platform.clapper; const u = P.use(T.x, T.z, { kind: 'ip_clapper' }); P.settle();
  const took = !!f.pp_clapper; P.talk('pf_chaplain'); P.settle();
  return { ask, use: u.r, took, bell: !!f.pp_bell, clovers: h.clovers - cl0 };
});
check('the Platform: Father Umber asks for the clapper; taken by the ore cart and brought back (INPUT): a clover', pf.ask && pf.took && pf.bell && pf.clovers === 1, pf);

// the Old Watch: the telescope shows the Orchard's lost crate
const ow = await ev(() => {
  const G = game, f = G.flags, h = G.hero; heroTo('isle_oldwatch');
  const p = G.rooms.isle_oldwatch.pois.find((q) => q.word === 'TELESCOPE'); const u = P.use(p.x, p.z, { kind: 'ip_scope' });
  const spied = !!f.pp_spied; heroTo('isle_orchard'); const c0 = h.coins;
  const C = IL.ISLE_THINGS.orchard.cache; const v = P.use(C.x, C.z, { kind: 'ip_cache' }); P.settle();
  return { u: u.r, spied, v: v.r, cache: !!f.pp_cache, kashes: h.coins - c0 };
});
check('the Old Watch: the telescope (INPUT) shows a lost crate on the Orchard; searched there: 15 kashes', ow.spied && ow.cache && ow.kashes === 15, ow);

// Knartas, the Lift Dock and Otringal's bar (chapter 9): the quay light's lens
await ev(() => { const f = game.flags, keep = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('pp_') || k.startsWith('sh_'))); setChapter('council', { c2_shield: true, c9_started: true, ...keep }); });
iso('chapter 9 again (flags), the islands\' pp_ flags kept');
const kn = await ev(() => {
  const G = game, f = G.flags, h = G.hero, out = {};
  heroTo('isle_knartas'); P.talk('kn_quill'); out.quill = !!f.pp_quill;
  const L = IL.ISLE_THINGS.knartas.light; P.use(L.prompt.x, L.prompt.z, { kind: 'ip_light' }); out.darkStill = !f.pp_light;
  heroTo('isle_liftdock'); P.talk('ld_crane'); out.manifest = !!f.pp_manifest;
  heroTo('isle_otringal'); const e = P.enter('otrbar'); out.bar = G.room?.id;
  const c0 = h.coins; P.talk('ot_boss'); out.shop = G.state; P.menuPick(0); P.settle(); out.paid = c0 - h.coins; out.lens = !!f.pp_lens;
  heroTo('isle_knartas'); const cl0 = h.clovers; P.use(L.prompt.x, L.prompt.z, { kind: 'ip_light' }); P.settle();
  out.light = !!f.pp_light; out.clovers = h.clovers - cl0; void e;
  return out;
});
check('Knartas (chapter 9, INPUT): Quill asks; the Lift Dock\'s manifest; Madam Orla sells the lens for 8; fitted, the light shines and gives a clover', kn.quill && kn.darkStill && kn.manifest && kn.bar === 'otrbar' && kn.shop === 'shop' && kn.paid === 8 && kn.lens && kn.light && kn.clovers === 1, kn);

// ---------------------------------------------------------------- save and reload
const before = await ev(() => { heroTo('isle_knartas'); game.save(false); return { pp: Object.keys(game.flags).filter((k) => k.startsWith('pp_')).sort(), keys: Object.keys(game.flags) }; });
await quitAndKeep(page, context, '/dev/shm/pp1-storage.json');
await open(page, '?nocine'); await menu(page, 'continue');
await install();
const after = await ev(() => { const G = game; G.step(0.5); return { room: G.room?.id, pp: Object.keys(G.flags).filter((k) => k.startsWith('pp_')).sort(), light: !!G.flags.pp_light, n: here('isle_knartas').length, want: 5 - (G.story.islife?.atHome().includes('il_mila') ? 1 : 0), lit: IL.ISLE_THINGS.knartas?.light ? true : false, raw: /phaseKey|_isleStops|ot_ulla|kn_quill/.test(JSON.stringify(localStorage).replace(/n_[a-z_]+|ip_[a-z_]+/g, '')) }; });
check('saved on Knartas and reloaded (INPUT: Quit, Continue): the islands\' pp_ flags back, the light lit, the people there (in chapter 9 Mila is at home: ISLES-BAR); nothing of theirs in the save but pp_ flags', after.room === 'isle_knartas' && JSON.stringify(after.pp) === JSON.stringify(before.pp) && after.light && after.n === after.want && !after.raw, { before: before.pp, after });
try { fs.unlinkSync('/dev/shm/pp1-storage.json'); } catch { /* (gone) */ }

// ---------------------------------------------------------------- cost
const fc = await ev(() => {
  const G = game; heroTo('isle_otringal', null); G.step(1);
  const mine = ppl('isle_otringal').filter((n) => !n.def.indoor);
  const on = frameCost();
  const vis = mine.map((n) => n.rig.root.visible); mine.forEach((n) => { n.rig.root.visible = false; if (n.shadow) n.shadow.visible = false; });
  const off = frameCost();
  mine.forEach((n, k) => { n.rig.root.visible = vis[k]; if (n.shadow) n.shadow.visible = vis[k]; });
  return { with: on, without: off, n: mine.length, rigs: G.npcs.filter((n) => n.def.isle || ['otrbar', 'otrhotel'].includes(n.def.room)).length };
});
console.log(`  cost: residents' update per 0.1 s step (CPU, SwiftShader, no fps): ${cost.map((c) => `${c.label} ${c.n}p ${c.ms} ms`).join('; ')}`);
console.log(`  cost: Otringal plaza frame: ${fc.with.calls} draws / ${fc.with.tris} tris with its ${fc.n} outdoor residents, ${fc.without.calls} / ${fc.without.tris} without; ${fc.rigs} island rigs exist after the reload (only the islands built since: none before an island is first built)`);
check('cost: Otringal\'s plaza residents add a bounded number of draws (≤ 12 per resident) to a frame', fc.with.calls - fc.without.calls <= 12 * fc.n, fc);
done();
await browser.close();
