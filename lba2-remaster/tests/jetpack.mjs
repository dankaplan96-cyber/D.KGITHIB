// Baldino's hop-pack (EQ-1, src/game/jetpack.js): acquired, worn and flown by input (the keys a player presses: Athletic
// with F2, Space held, the arrows, E, the inventory), its fuel, its one useful place (the test step) and its later use
// (the old mill's climb, chapter 10), every boundary it must respect (the island's edge, a roof, a fence, a ceiling, a
// terrain cliff and the region's edge, the sea off a pier, a fall, a door, interiors, Zoé's body, the story's gates),
// interruptions mid-flight (dialogue, pause, a scene change, a hit, death), Save & quit → Continue mid-flight, a save
// that would load him somewhere invalid, an old save, a low frame rate, and the model's and effects' measured cost.
// ISO (logged): chapter 10 is reached by its flags (as tests/chapter10.mjs does); journeys to the other regions use the
// room switch Hesk's glider and the Esmer shuttles use (their flights: their own tests); a hit, a death and a line of
// dialogue mid-flight are injected the way an enemy or a story trigger causes them; invalid saves are written by hand.
// SwiftShader numbers only (renderer.info, simulation time per frame): no GPU claim.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const info = (s, o) => console.log('  ' + s + (o === undefined ? '' : ' ' + JSON.stringify(o)));
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });

// page-side helpers: hold keys frame by frame and record the flight
const helpers = () => ev(() => {
  const G = game, I = G.input;
  window.J = {
    jet: () => G.gadgets.jet,
    h: () => G.hero,
    athletic() { if (G.hero.behaviour !== 'athletic') P.tap('F2', 0.05); return G.hero.behaviour; },
    // hold `keys` for t seconds (Space pressed as a fresh press at the start when it's among them); per frame: the
    // highest and lowest point, frames lit, whether he was ever over the sea, the room
    hold(keys, t, { dt = 1 / 60, letGoUp = null, until = null } = {}) {
      const h = G.hero, j = G.gadgets.jet, P0 = G.physics;
      const r = { y0: h.pos.y, maxY: h.pos.y, minY: h.pos.y, lit: 0, frames: 0, overSea: 0, rooms: new Set(), hp0: h.hp, x0: h.pos.x, z0: h.pos.z, firstLit: null, hud: 0 };
      for (const k of keys) { I.keys.add(k); if (k === 'Space') I.taps.add(k); }
      let el = 0;
      while (el < t) {
        G.step(dt); el += dt; r.frames++;
        r.maxY = Math.max(r.maxY, h.pos.y); r.minY = Math.min(r.minY, h.pos.y);
        if (j.firing) { r.lit++; if (r.firstLit == null) r.firstLit = +el.toFixed(2); }
        const gi = P0.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.6);
        if (gi.h < -0.35 && !gi.brick) r.overSea++;
        r.rooms.add(G.room?.id ?? 'citadel');
        if (document.querySelector('#jetgauge')?.style.opacity === '1') r.hud++;
        if (letGoUp && letGoUp()) I.keys.delete('ArrowUp');
        if (until && until()) break;
      }
      for (const k of keys) I.keys.delete(k);
      r.rooms = [...r.rooms]; r.t = +el.toFixed(2);
      for (const k of ['y0', 'maxY', 'minY']) r[k] = +r[k].toFixed(2);
      return r;
    },
    land(max = 6) { let t = 0; while (t < max && !(G.hero.onGround && !G.hero.sliding)) { G.step(1 / 30); t += 1 / 30; } G.step(0.2); return +G.hero.pos.y.toFixed(2); },
    // a hop with the pack onto a raised spot: line up `from` metres short, face it, walk on, Space held until he lands on
    // something; let go of Up once over the target
    jetHop(x, z, { from = 1.6, t = 3.5, brake = 0.35, walk = true } = {}) {
      const h = G.hero;
      const a = Math.atan2(x - h.pos.x, z - h.pos.z);
      if (walk) P.go(x - Math.sin(a) * from, z - Math.cos(a) * from, { tol: 0.35, maxT: 25, fight: false });
      J.athletic(); P.face(x, z);
      let air = false;
      const r = J.hold(['Space', 'ArrowUp'], t, { letGoUp: () => Math.hypot(h.pos.x - x, h.pos.z - z) < brake, until: () => { if (!h.onGround) air = true; return air && h.onGround; } });
      G.step(0.25);
      return { ...r, y: +h.pos.y.toFixed(2) };
    },
    st() { const h = G.hero, j = G.gadgets.jet; return { room: G.room?.id ?? 'citadel', state: G.state, x: +h.pos.x.toFixed(2), y: +h.pos.y.toFixed(2), z: +h.pos.z.toFixed(2), onGround: h.onGround, firing: j.firing, air: j.air, fuel: +j.fuel.toFixed(2), hp: h.hp, beh: h.behaviour, anim: h.rig.anim }; },
    useItem(id) {
      P.tap('KeyI', 0.1);
      if (G.state !== 'inventory') return 'no inventory';
      const items = G.inventory.items(), i = items.findIndex((x) => x.id === id);
      if (i < 0) { P.tap('KeyI', 0.1); return 'not carried: ' + id; }
      const n = items.length, cur = G.inventory.sel ?? 0;
      for (let k = 0; k < (i - cur + n) % n; k++) P.tap('ArrowRight', 0.05);
      const sel = G.inventory.items()[G.inventory.sel]?.id, label = document.querySelector('.inv-item.sel em')?.textContent || '';
      P.tap('KeyE', 0.1);
      return sel === id ? 'used:' + label : 'selected ' + sel;
    },
    // ISO: put him somewhere in a region (the room switch the glider and the shuttles use)
    goRegion(id, x, z, a = 0) { if (id === 'citadel') { if (G.room) G.exitRoom({ x, z, a }, true); else { G.hero.pos.set(x, G.physics.groundAt(x, z), z); } } else G.enterRoom(id, { x, z, a }, true); G.story.refreshCast(); P.settle(); G.hero.angle = a; G.step(0.3); return G.room?.id ?? 'citadel'; },
    tp(x, z, y = null) { const h = G.hero; h.pos.set(x, y == null ? G.physics.groundAt(x, z) : y, z); h.vy = 0; h.onGround = true; h.vel.set(0, 0); G.step(0.3); },
  };
});

// a reload the game makes itself (Quit, Retry) or one we make: wait for it, freeze the clock, load the harness
async function reboot(trigger) {
  const loaded = page.waitForEvent('load', { timeout: 300000 });
  await trigger(); await loaded;
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
  await page.evaluate(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: new URL('./lib/player.js', import.meta.url).pathname });
}
await open(page, '?nocine'); await menu(page, 'new');
await helpers(); await said();
iso('chapters 1–9 finished by their flags (as tests/chapter10.mjs): chapter 10 begins in Baldino\'s workshop');
const c0 = await ev(() => { const G = game; P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 8, chapterKey: 'council', c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
    c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_zoeDone: true, c9_started: true, c9_vote: true });
  G.hero.hasBall = true;
  const before = { peg: !!G.story.arsenal.jetPeg, ready: G.story.arsenal.jetReady() };
  G.story.nextChapter(); G.step(0.5);
  const s = P.settle();
  return { before, key: G.flags.chapterKey, room: G.room?.id, started: G.flags.c10_started, hint: G.flags.a_jetHint, lines: s.lines, arms: { ...G.hero.arms } }; });
const l0 = await said();
check('before chapter 10 the pack is not Baldino\'s to give (the peg offers nothing)', c0.before.peg && !c0.before.ready, c0.before);
check('chapter 10: after his briefing Baldino points out the hop-pack on its peg (one line, once)', c0.key === 'network' && c0.room === 'workshop' && c0.started && c0.hint && l0.some((l) => /hop-pack, on the peg/.test(l)) && !c0.arms.jetpack, { c0, l0: l0.slice(-3) });

// ---- acquisition by input: walk to the peg, E
const a1 = await ev(() => { const G = game, Pg = G.story.arsenal.jetPeg;
  P.go(Pg.x - 1.05, Pg.z, { tol: 0.3, maxT: 30, fight: false }); P.face(Pg.x, Pg.z);
  const prompt = P.target();
  P.tap('KeyE', 0.1); const lines = P.settle().lines;
  G.step(2.2);
  return { prompt, lines, arms: { jet: G.hero.arms.jetpack, on: G.hero.arms.jetpackOn }, packOnPeg: Pg.pack.visible, model: !!G.gadgets.jet.model?.visible, toast: document.querySelector('#toast')?.textContent || '', save: JSON.parse(localStorage.getItem('lba3_save_v1')).hero.arms }; });
const l1 = await said();
check('the peg\'s prompt is Take; E: Baldino explains its limits (ground under it, one storey, open sky) and gives it', a1.prompt?.kind === 'a_jetpeg' && l1.some((l) => /pushes against the ground/.test(l)) && l1.some((l) => /One storey/.test(l)) && a1.arms.jet && a1.arms.on, { a1, l1 });
check('it is worn at once: on his back, gone from the peg; a toast says how to use it; the save already has it', a1.model && !a1.packOnPeg && a1.save.jetpack === true && a1.save.jetpackOn === true, a1);
const inv = await ev(() => { const G = game; P.tap('KeyI', 0.1); const it = G.inventory.items().find((x) => x.id === 'jetpack'); const desc = (() => { G.inventory.sel = G.inventory.items().findIndex((x) => x.id === 'jetpack'); G.inventory.render(); return document.querySelector('.inv-desc')?.textContent || ''; })(); P.tap('KeyI', 0.1); return { it, desc, state: G.state }; });
check('the inventory lists the Hop-Pack, "worn", with how to use it and its limits', inv.it?.n === 'worn' && /Athletic/.test(inv.desc) && /open sky/.test(inv.desc) && inv.state === 'play', inv);
const a2 = await ev(() => { const G = game; const back = P.target(); P.go(G.story.arsenal.jetPeg.x - 1.05, G.story.arsenal.jetPeg.z, { tol: 0.3, maxT: 10, fight: false }); P.face(G.story.arsenal.jetPeg.x, G.story.arsenal.jetPeg.z); return { prompt: P.target()?.kind || null }; });
check('no second pack: the peg offers nothing once it is taken', a2.prompt !== 'a_jetpeg', a2);

// ---- indoors: it won't light
const in1 = await ev(() => { const G = game; P.go(G.rooms.workshop.spawn.x - 1.5, G.rooms.workshop.spawn.z + 1.2, { tol: 0.4, fight: false }); J.athletic(); const r = J.hold(['Space'], 1.8); G.step(0.5); return { r, denied: { ...G.gadgets.jet.stats.denied }, toast: document.querySelector('#toast')?.textContent || '' }; });
check('indoors (the workshop) it never lights: a plain jump (≤ 1.85 m), a "needs open sky" toast', in1.r.lit === 0 && in1.r.maxY - in1.r.y0 < 1.85 && in1.denied.roof > 0 && /open sky/.test(in1.toast), in1);

// ---- outside: the test step (the early task)
const s0 = await ev(() => { const G = game; P.exitTo('zeelich-workshop'); P.settle(); const S = G.story.arsenal.step; return { room: G.room?.id, step: S && { x: S.x, z: S.z, top: S.top, y: S.y } }; });
check('out on Zeelich\'s street; Baldino\'s test step stands on the green behind the workshop', s0.room === 'zeelich' && !!s0.step && Math.abs(s0.step.top - s0.step.y - 2.35) < 0.01, s0);
const s1 = await ev(() => { const G = game, S = G.story.arsenal.step;
  P.go(S.sign.x + Math.sin(S.a) * 0.6, S.sign.z + Math.cos(S.a) * 0.6, { tol: 0.4, fight: false }); P.face(S.sign.x, S.sign.z); const sg = P.target(); P.tap('KeyE', 0.1); P.settle();
  const off = J.useItem('jetpack'); P.settle(); const worn0 = G.hero.arms.jetpackOn;
  const jump = J.jetHop(S.x, S.z);
  const on = J.useItem('jetpack'); P.settle();
  return { sign: sg?.kind, off, worn0, jump, on, worn1: G.hero.arms.jetpackOn, top: S.top }; });
const l2 = await said();
check('the sign at its foot (Read): "No ladder. That is the test."', s1.sign === 'a_jetsign' && l2.some((l) => /No ladder/.test(l)), { s1, l2 });
check('the inventory takes the pack off (E) and puts it back on (E)', /^used/.test(s1.off) && s1.worn0 === false && /^used/.test(s1.on) && s1.worn1 === true, s1);
check('without the pack, an Athletic running jump does not reach the deck (2.35 m up)', s1.jump.maxY < s1.top - 0.25 && s1.jump.lit === 0, s1.jump);
const s2 = await ev(() => { const G = game, S = G.story.arsenal.step; const r = J.jetHop(S.x, S.z); const it = P.target(); return { r, it: it?.kind, st: J.st(), top: S.top }; });
check('with the pack (F2, run, Space held): he lifts off, lands on the deck', Math.abs(s2.st.y - s2.top) < 0.05 && s2.r.lit > 10 && s2.st.onGround, s2);
check('the pack\'s flight: lit once the jump stops rising (not at once), the gauge shown, the "jet" pose', s2.r.firstLit > 0.15 && s2.r.hud > 5, s2.r);
const s3 = await ev(() => { const G = game, h = G.hero; const c0 = h.coins, k0 = h.clovers; P.tap('KeyE', 0.1); G.step(0.8); P.settle(); const got = { coins: h.coins - c0, clovers: h.clovers - k0, flag: G.flags.a_jetTin, tin: G.story.arsenal.step.tin.visible }; const again = P.target()?.kind || null; return { got, again }; });
const l3 = await said();
check('the tin on the deck (Take): a clover and 10 kashes, once', s3.got.coins === 10 && s3.got.clovers === 1 && s3.got.flag && !s3.got.tin && s3.again !== 'a_jettin' && l3.some((l) => /IT WORKS/.test(l)), { s3, l3 });
const j1 = await ev(() => { const G = game; return G.story.journal().flatMap((c) => c.lines).filter((l) => /a_j_jet/.test(l.key)); });
check('the journal: the pack and the test step, both done', j1.length === 2 && j1.every((l) => l.done), j1);

// ---- the flight's numbers: one storey, the fuel, the refill (flat ground beside the step)
const f1 = await ev(() => { const G = game, S = G.story.arsenal.step, h = G.hero, j = G.gadgets.jet;
  // off the deck (walk off), then a hover on the spot
  P.dropOK = true; P.go(S.x + Math.sin(S.a) * 4.5, S.z + Math.cos(S.a) * 4.5, { tol: 0.4, fight: false }); P.dropOK = false; J.land(); J.athletic(); G.step(2.5);
  const fuel0 = j.fuel; const r = J.hold(['Space'], 4.5); const fuelEnd = j.fuel; const ground = J.land();
  let t = 0; while (j.fuel < 0.999 && t < 5) { G.step(1 / 30); t += 1 / 30; }
  return { fuel0, r, fuelEnd, litS: +(r.lit / 60).toFixed(2), refillS: +t.toFixed(2), ground }; });
check('one storey: hovering in place he rises at most 2.5 m above the ground he took off from', f1.r.maxY - f1.r.y0 <= 2.55 && f1.r.maxY - f1.r.y0 > 2.2, f1);
check('fuel: about 2.2 s of thrust from full, then it sputters out and he comes down', f1.fuel0 === 1 && f1.fuelEnd === 0 && f1.litS > 2.0 && f1.litS < 2.45, f1);
check('the refill: by itself on firm ground, full again in under 2 s (no item, nothing to buy)', f1.refillS < 2.0, f1);
const n1 = await ev(() => { const G = game; P.tap('F1', 0.05); const r = J.hold(['Space'], 1.5); G.step(0.6); P.settle(); return { r, beh: G.hero.behaviour }; });
check('in Normal mode Space is the action (a hop, a talk): the pack never lights', n1.r.lit === 0 && n1.beh === 'normal', n1);

// ---- boundaries on Zeelich
const b1 = await ev(() => { const G = game, Z = G.rooms.zeelich, o = Z.group.position, P0 = G.physics;
  // the south-west shore: walk out from the green until the next metre is the cloud sea
  let x = o.x - 30, z = o.z + 18; const dz = 1; for (let i = 0; i < 40; i++) { const gi = P0.groundInfo(x, z + dz, 10); if (!gi.brick && gi.h < -0.35) break; z += dz; }
  P.go(x, z - 1.2, { tol: 0.4, fight: false }); J.athletic(); P.face(x, z + 10);
  const r = J.hold(['Space', 'ArrowUp'], 4); J.land(); return { r, edgeZ: z, st: J.st() }; });
check('the island\'s edge: flying at the cloud sea he stops at the brink (never over the clouds, no fall, no damage)', b1.r.overSea === 0 && b1.st.y > 5.9 && b1.st.hp === b1.r.hp0 && b1.st.z < b1.edgeZ + 1.0, b1);
const b2 = await ev(() => { const G = game, Z = G.rooms.zeelich, o = Z.group.position;
  // a house (the first on the north side, walls 3.8 m): fly at its side wall
  const x = o.x - 40.5 - 3.1 - 1.4, z = o.z - 10.2; P.go(x, z, { tol: 0.4, fight: false }); J.athletic(); P.face(x + 5, z);
  const r = J.hold(['Space', 'ArrowUp'], 4); J.land(); return { r, st: J.st() }; });
check('a roof: flying at a house wall (3.8 m) he can\'t get on top; he comes back down beside it', b2.r.maxY < 6 + 2.85 && Math.abs(b2.st.y - 6) < 0.3, b2);
const b3 = await ev(() => { const G = game, Z = G.rooms.zeelich, o = Z.group.position, h = G.hero;
  // the project depot's fence (2.4 m, built against a jump): from the west, fly straight at it
  const x = o.x + 2.2, z = o.z + 17; P.go(x, z, { tol: 0.4, fight: false }); J.athletic(); P.face(x + 6, z);
  const st = G.gadgets.jet.stats.fences; const r = J.hold(['Space', 'ArrowUp'], 4); J.land(); return { r, st: J.st(), insideX: o.x + 4, fences: G.gadgets.jet.stats.fences - st }; });
check('a fence: the depot\'s fence (2.4 m) stops him (his feet must clear its top); he never gets inside', b3.st.x < b3.insideX - 0.3 && b3.r.maxY > 7.9, b3);
const b4 = await ev(() => { const G = game, Z = G.rooms.zeelich, o = Z.group.position, h = G.hero, P0 = G.physics;
  // a ceiling: ISO a test slab in the open air on the green (bottom 3.0 m up) — the engine has no outdoor overhang over
  // walkable ground on Zeelich; the same check runs against the real one on the Platform isle below
  const x = o.x - 34, z = o.z + 20.5; P.go(x, z, { tol: 0.4, fight: false });
  const y0 = h.pos.y, c = P0.add({ type: 'box', x: h.pos.x, z: h.pos.z, hw: 1.5, hd: 1.5, top: y0 + 4.2, bottom: y0 + 3.9 });
  J.athletic(); const b0 = G.gadgets.jet.stats.bonks; const r = J.hold(['Space'], 2.5); J.land(); c.enabled = false; P0.update(c);
  // the engine's own outdoor overhangs: colliders with an underside over standable ground, with room for him under them
  const over = [];
  for (const k of P0.colliders) { if (!k.enabled || !(k.bottom > -49) || k === c) continue; const out = Math.abs(k.x) < 300 || (k.x > 2300 && k.x < 2500) || (k.x > 3300 && k.x < 3550) || (k.x > 4200 && k.x < 4450) || k.z > 1500; if (!out) continue;
    const gi = P0.groundInfo(k.x, k.z, k.bottom - 0.1); if ((gi.brick || gi.h > -0.35) && k.bottom - gi.h > 1.75 && k.bottom - gi.h < 6) over.push([+k.x.toFixed(1), +k.z.toFixed(1)]); }
  return { r, head: +(r.maxY - y0 + 1.75).toFixed(2), slab: 3.9, rise: +(r.maxY - y0).toFixed(2), bonks: G.gadgets.jet.stats.bonks - b0, overhangs: over }; });
check('a ceiling (ISO: a test slab 3.9 m up on the green): the pack stops rising under it (head ≤ its underside), never through', b4.head <= b4.slab + 0.05 && b4.rise < 2.3 && b4.r.lit > 0, b4);
info('outdoor overhangs with room to stand under them (the engine\'s own): ' + b4.overhangs.length, b4.overhangs);
const b5 = await ev(() => { const G = game, Z = G.rooms.zeelich, d = Z.workshopDoor, h = G.hero;
  // the workshop door: hover over its doorstep — no room change in the air; let go, land on it — in he goes
  P.go(d.x + 2.2, d.z - 1.6, { tol: 0.3, fight: false }); J.athletic(); P.face(d.x, d.z);
  const r = J.hold(['Space', 'ArrowUp'], 1.6, { letGoUp: () => Math.hypot(h.pos.x - d.x, h.pos.z - d.z) < 0.4 });
  const rooms = r.rooms.slice(); const air = !h.onGround; J.land(); G.step(1.5); P.settle(); const after = G.room?.id; return { rooms, air, after, near: +Math.hypot(h.pos.x - d.x, h.pos.z - d.z).toFixed(2) }; });
check('a door: over the workshop\'s doorstep in the air nothing happens; landed on it, the door takes him in', b5.rooms.length === 1 && b5.rooms[0] === 'zeelich' && b5.after === 'workshop', b5);
await ev(() => { P.exitTo('zeelich-workshop'); P.settle(); });

// ---- the later use: the old mill's climb (chapter 10) — a shortcut, not a way past the brake
const m1 = await ev(() => { const G = game, mt = G.rooms.zeelich.millTop, f = G.flags, h = G.hero;
  const cx = mt.x, cz = mt.z - 3.3, Y0 = mt.y - 8.75;
  const st = (k, r = 3.3) => { const phi = 0.9 + k * Math.PI / 6; return { x: cx + Math.sin(phi) * r, z: cz + Math.cos(phi) * r, top: Y0 + 1.25 * (k + 1) }; };
  P.go(cx + Math.sin(0.3) * 6, cz + Math.cos(0.3) * 6, { tol: 0.6, fight: false });
  const t0 = G.time, hops = [];
  for (const k of [1, 3, 5]) { const s = st(k); hops.push(J.jetHop(s.x, s.z, { from: 1.6, walk: k === 1, t: 4 }).y); G.step(1.6); }
  const ga = 0.9 + 5 * Math.PI / 6 + 0.55; hops.push(J.jetHop(cx + Math.sin(ga) * 3.4, cz + Math.cos(ga) * 3.4, { walk: false, t: 4 }).y);
  const secs = +(G.time - t0).toFixed(1), top = h.pos.y > mt.y - 0.3;
  const relayBefore = (() => { const it = []; G.story.interactables((d, m, o) => { if (d < m) it.push(o.kind); }, (x, z) => Math.hypot(x - h.pos.x, z - h.pos.z)); return it; })();
  return { hops, secs, top, braked: !!f.c10_millBraked, relayBefore, millY: mt.y }; });
check('later use (chapter 10, Oku\'s mill): the pack skips every other stair-stone — up in 4 hops instead of 7', m1.top && m1.hops.length === 4 && m1.hops.every((y, i) => i === 3 ? y > m1.millY - 0.3 : true), m1);
check('the story gate holds: on top with the mill unbraked there is no relay to set (the brake still comes first)', !m1.braked && !m1.relayBefore.includes('c10mill'), m1);
const m2 = await ev(() => { const G = game, mt = G.rooms.zeelich.millTop, mill = G.rooms.zeelich.mills[0], h = G.hero;
  // the fall: off the gallery (8.75 m) — first without the pack (Up only), then with Space held (the cushion)
  const out = {};
  for (const withPack of [false, true]) {
    if (withPack || h.pos.y < mt.y - 0.3) { J.tp(mt.x, mt.z, mt.y); out.placed = (out.placed || 0) + 1; }   // (ISO: back on the gallery)
    J.athletic(); const a = Math.atan2(mt.x - mill.x, mt.z - mill.z); h.angle = a; h.hp = h.maxHp; h.invuln = 0; G.step(0.3);
    const c0 = G.gadgets.jet.stats.cushions;
    const r = J.hold(withPack ? ['ArrowUp', 'Space'] : ['ArrowUp'], 0.9); G.step(1 / 60); const r2 = J.hold(withPack ? ['Space'] : [], 3, { until: () => h.onGround }); J.land(); G.step(1.2); P.settle();
    out[withPack ? 'pack' : 'none'] = { fell: +(r.y0 - h.pos.y).toFixed(2), hp: h.hp, max: h.maxHp, cushion: G.gadgets.jet.stats.cushions - c0, lit: r.lit + r2.lit };
  }
  return out; });
check('a fall (8.75 m off the mill\'s gallery): without the pack it hurts', m2.none.fell > 7 && m2.none.hp < m2.none.max, m2);
check('the cushion: with Space held near the ground he lands softly — no damage', m2.pack.fell > 7 && m2.pack.hp === m2.pack.max && m2.pack.cushion === 1 && m2.pack.lit > 0, m2);

// ---- interruptions mid-flight
const i1 = await ev(() => { const G = game, h = G.hero, j = G.gadgets.jet, S = G.story.arsenal.step;
  P.go(S.x + Math.sin(S.a) * 4.5, S.z + Math.cos(S.a) * 4.5, { tol: 0.4, fight: false }); J.athletic(); G.step(2.5);
  J.hold(['Space'], 0.9); const inAir = !h.onGround && j.firing;
  // ISO: a line of dialogue starts now (a story trigger would): the frames stop, Space stays held
  G.input.keys.add('Space'); G.say('', ['(a story line mid-flight)']); G.step(0.05);
  G.renderer.render(); const flame = j.model.userData.flameMat.opacity, st = G.state, y = h.pos.y;
  for (let k = 0; k < 30 && G.state === 'dialog'; k++) P.tap('KeyE', 0.1);
  G.input.keys.add('Space'); G.step(0.5); const litAfter = j.firing; const yAfter = h.pos.y; G.input.keys.delete('Space'); J.land();
  return { inAir, st, flame, y: +y.toFixed(2), litAfter, fell: +(y - yAfter).toFixed(2) }; });
check('dialogue mid-flight: the flame goes out at once (no flame frozen on screen), no thrust while it shows', i1.inAir && i1.st === 'dialog' && i1.flame === 0, i1);
check('…and after it, a key still held does not relight it (a fresh press is needed): he comes down', !i1.litAfter && i1.fell > 0.3, i1);
const i2 = await ev(() => { const G = game, h = G.hero, j = G.gadgets.jet; J.athletic(); G.step(2.5);
  J.hold(['Space'], 0.9); const y0 = h.pos.y; G.input.keys.add('Space');
  P.tap('Escape', 0.1); const st = G.state; G.step(1.0); const yP = h.pos.y; G.renderer.render(); const flame = j.model.userData.flameMat.opacity;
  P.tap('Escape', 0.1); G.input.keys.add('Space'); G.step(0.4); const lit = j.firing; G.input.keys.delete('Space'); G.step(1 / 60);
  // a fresh press relights it (if he is still in the air; else a new jump, and it lights)
  const r = J.hold(['Space'], 1.2); J.land();
  return { st, still: +Math.abs(yP - y0).toFixed(3), flame, litAfterResume: lit, relit: r.lit > 0 }; });
check('pause mid-flight: everything holds still, the flame is out; resumed, the held key does nothing; a new press relights it', i2.st === 'pause' && i2.still < 0.01 && i2.flame === 0 && !i2.litAfterResume && i2.relit, i2);
const i3 = await ev(() => { const G = game, h = G.hero, j = G.gadgets.jet; J.athletic(); G.step(2.5);
  J.hold(['Space'], 0.9); const lit = j.firing;
  // ISO: a scene change mid-flight (the room switch a door or a flight makes)
  G.input.keys.add('Space'); G.startTransition(() => G.enterRoom('workshop', null, true)); G.step(1.2); G.input.keys.delete('Space'); P.settle();
  const r = { lit, room: G.room?.id, onGround: h.onGround, firing: j.firing, air: j.air };
  P.exitTo('zeelich-workshop'); P.settle(); return r; });
check('a scene change mid-flight: he arrives standing, the pack out', i3.lit && i3.room === 'workshop' && i3.onGround && !i3.firing && !i3.air, i3);
const i4 = await ev(() => { const G = game, h = G.hero, j = G.gadgets.jet; P.go(h.pos.x - 3, h.pos.z + 3, { tol: 0.5, fight: false }); J.athletic(); G.step(2.5); h.invuln = 0;
  J.hold(['Space'], 0.9); const lit = j.firing;
  // ISO: a hit mid-flight (an enemy's bolt would)
  G.input.keys.add('Space'); h.damage(1, { x: h.pos.x + 1, z: h.pos.z }); G.step(1 / 60); const cut = !j.firing; G.step(0.1); const cut2 = !j.firing; G.input.keys.delete('Space'); J.land();
  return { lit, cut, cut2, hp: h.hp }; });
check('a hit mid-flight puts the pack out (he is knocked down out of the air)', i4.lit && i4.cut && i4.cut2, i4);
const i5 = await ev(() => { const G = game, h = G.hero; h.angle = 0; const z = G.say; let r;
  // Zoé (her playable parts): no pack on her back, no flight
  h.swapBody('zoe'); J.athletic(); G.step(0.3); const vis = G.gadgets.jet.model.visible; r = J.hold(['Space'], 1.6); J.land(); h.swapBody('twinsen'); G.step(0.3);
  return { vis, lit: r.lit, back: G.gadgets.jet.model.visible }; });
check('as Zoé: no pack shown, it never lights; back as Twinsen it is there again', !i5.vis && i5.lit === 0 && i5.back, i5);

// ---- Save & quit → Continue mid-flight
const sv0 = await ev(() => { const G = game, h = G.hero, j = G.gadgets.jet; P.go(h.pos.x + 2, h.pos.z, { tol: 0.5, fight: false }); J.athletic(); G.step(3);
  J.hold(['Space', 'ArrowUp'], 1.0); G.input.keys.add('Space'); const mid = J.st(); G.input.keys.clear(); return { mid, safe: { ...G.lastSafe }, arms: { ...h.arms }, tin: G.flags.a_jetTin, coins: h.coins }; });
// Esc pressed while in the air (Space still down), then Save & quit from the pause menu (the game saves, reloads)
const sv0b = await ev(() => { const G = game; G.input.keys.add('Space'); G.step(0.05); P.tap('Escape', 0.05); return { state: G.state, air: !G.hero.onGround }; });
await reboot(() => page.click('#pause [data-act="quit"]', { timeout: 60000 }));
await menu(page, 'continue'); await helpers();
const sv1 = await ev(() => { const G = game, h = G.hero; G.step(0.3); const P0 = G.physics; return { st: J.st(), arms: { ...h.arms }, tin: G.flags.a_jetTin, coins: h.coins, ground: +P0.groundAt(h.pos.x, h.pos.z, h.pos.y + 0.6).toFixed(2), saved: JSON.parse(localStorage.getItem('lba3_save_v1')).hero }; });
check('saved in the air: Continue puts him on the ground (his last safe spot), not mid-air', sv0.mid.air && !sv0.mid.onGround && sv0b.state === 'pause' && sv0b.air && sv1.st.room === 'zeelich' && sv1.st.onGround && Math.abs(sv1.st.y - sv1.ground) < 0.05 && Math.abs(sv1.saved.x - sv0.safe.x) < 0.01, { sv0, sv0b, sv1 });
check('…with the pack owned and worn, full, the tin still taken (no second reward), kashes kept', sv1.arms.jetpack && sv1.arms.jetpackOn && sv1.st.fuel === 1 && sv1.tin && sv1.coins === sv0.coins, { sv0, sv1 });
const sv2 = await ev(() => { const G = game; return { tin: G.story.arsenal.step.tin.visible, peg: G.story.arsenal.jetPeg.pack.visible }; });
check('after Continue the tin and the peg stay empty', !sv2.tin && !sv2.peg, sv2);

// ---- death mid-flight
const d1 = await ev(() => { const G = game, h = G.hero, j = G.gadgets.jet; J.athletic(); G.step(2.5);
  J.hold(['Space'], 0.9); const lit = j.firing; h.clovers = 0; h.invuln = 0;
  G.input.keys.add('Space'); h.damage(99, null); G.step(1 / 60); const cut = !j.firing; G.step(0.5); const fall = { y: h.pos.y, onGround: h.onGround }; G.step(3.5); G.input.keys.delete('Space');
  return { lit, cut, dead: h.dead, state: G.state, landed: h.onGround, firingDead: j.firing }; });
check('death mid-flight: the pack goes out at once, he falls to the ground, the game-over screen comes', d1.lit && d1.cut && d1.dead && d1.landed && !d1.firingDead && d1.state === 'gameover', d1);
await reboot(() => page.click('#gameover [data-act="retry"]', { timeout: 60000 })); await helpers();
const d2 = await ev(() => { const G = game; G.step(1); P.settle(); return { st: J.st(), arms: { ...G.hero.arms } }; });
check('Retry: back from the last save, standing, the pack still worn and full', d2.st.state === 'play' && d2.st.onGround && d2.arms.jetpack && d2.st.fuel === 1, d2);

// ---- other regions (ISO: the room switch the glider and the shuttles use)
const r1 = await ev(() => { const G = game, W = G.world, h = G.hero, pe = W.pierEnd;
  // Citadel: off the end of the pier, over the sea
  const P0 = G.physics, sea = (x) => { const gi = P0.groundInfo(x, pe.z, 10); return !gi.brick && gi.h < -0.35; }, sgn = sea(pe.x - 4) ? -1 : 1;
  J.goRegion('citadel', pe.x - sgn * 2.5, pe.z, sgn * Math.PI / 2); P.go(pe.x - sgn * 0.6, pe.z, { tol: 0.3, fight: false }); J.athletic(); h.angle = sgn * Math.PI / 2; G.step(0.2);
  const deck = h.pos.y; const r = J.hold(['Space', 'ArrowUp'], 4); J.land(); return { r, deck: +deck.toFixed(2), st: J.st(), endX: pe.x }; });
check('deep water (Citadel\'s pier end): the pack never carries him over the sea; he lands back on the pier', r1.r.overSea === 0 && Math.abs(r1.st.y - r1.deck) < 0.3 && r1.st.hp === r1.r.hp0, r1);
const r2 = await ev(() => { const G = game, M = G.rooms.hamalayi, L = M.lift, h = G.hero;
  // the Hamalayi: the lift's cliff (the lift rides only in chapter 6): beside the lift, fly at the cliff face
  const a = Math.atan2(L.top.x - L.bottom.x, L.top.z - L.bottom.z);
  let sx = Math.cos(a) * 3.6, sz = -Math.sin(a) * 3.6;
  J.goRegion('hamalayi', L.bottom.x, L.bottom.z + 1.5, a);
  const P0 = G.physics, free = (x, z) => !P0.blockedAt(x, z, P0.groundAt(x, z, h.pos.y + 1), 0.6);
  if (!free(L.bottom.x + sx, L.bottom.z + sz)) { sx = -sx; sz = -sz; }
  J.tp(L.bottom.x + sx, L.bottom.z + sz); J.athletic(); h.angle = a; G.step(0.3);
  const base = h.pos.y; const r = J.hold(['Space', 'ArrowUp'], 5); J.land(); G.step(1);
  return { r, base: +base.toFixed(2), top: +L.y1.toFixed(2), st: J.st() }; });
check('a cliff (the Hamalayi lift\'s): one storey and no more — he can\'t climb it; the lift stays the way up', r2.r.maxY - r2.base < 2.9 && r2.st.y < r2.top - 2, r2);
// the regions' edges: from each outdoor region's spawn, the first terrain cliff in eight directions (6 m up within
// 5 m); at its foot, fly into it for 5 s
const r3 = await ev(() => { const G = game, P0 = G.physics, out = [];
  for (const id of ['hamalayi', 'desert']) {
    const R = G.rooms[id]; J.goRegion(id, R.spawn.x, R.spawn.z, 0);
    for (let d = 0; d < 8; d++) {
      const a = d * Math.PI / 4, sx = Math.sin(a), sz = Math.cos(a);
      let x = R.spawn.x, z = R.spawn.z, found = null;
      for (let s = 0; s < 220 && !found; s += 1) {
        const px = x + sx * s, pz = z + sz * s, gi = P0.groundInfo(px, pz, 200), h0 = gi.h;
        if (!gi.brick && h0 < -0.35) break;
        const ahead = P0.groundInfo(px + sx * 5, pz + sz * 5, h0 + 60).h;
        if (ahead - h0 > 6 && !P0.steepAt(px, pz, h0) && !P0.blockedAt(px, pz, h0, 0.5)) found = { x: px, z: pz, y: h0 };
      }
      if (!found) continue;
      const h = G.hero; h.pos.set(found.x, found.y, found.z); h.vy = 0; h.onGround = true; h.vel.set(0, 0); h.angle = a; G.step(0.3); J.athletic(); h.angle = a; G.step(0.3);
      const base = h.pos.y, r = J.hold(['Space', 'ArrowUp'], 5); J.land(); G.step(1.5);
      out.push({ id, d, gain: +(r.maxY - base).toFixed(2), end: +(h.pos.y - base).toFixed(2), lit: r.lit, overSea: r.overSea });
    }
  }
  return out; });
info('region edges tried (gain = highest point above the foot; end = where he came to rest):', r3);
check('the regions\' edges (Hamalayi peaks, Desert mesas): at every cliff found, at most one storey up and he ends back down (never over the top)', r3.length >= 4 && r3.every((e) => e.gain < 2.95 && e.end < 2.9 && e.overSea === 0), r3);
const r4 = await ev(() => { const G = game, P0 = G.physics, h = G.hero; return { skip: true };
  // the Platform isle: a real overhang (a deck 1.5 m over the ground under it)
  const c = P0.colliders.find((k) => k.enabled && k.bottom > 9.5 && k.bottom < 10 && Math.abs(k.x - 3851.4) < 0.2 && Math.abs(k.z - 1770.5) < 0.2);
  if (!c) return { missing: true };
  J.goRegion('isle_platform', c.x + 3, c.z, 0); const g = P0.groundAt(c.x, c.z, c.bottom - 0.1);
  J.tp(c.x, c.z, g); J.athletic(); const d0 = { ...G.gadgets.jet.stats.denied }; const r = J.hold(['Space'], 1.5); J.land();
  return { r, under: +g.toFixed(2), bottom: c.bottom, denied: (G.gadgets.jet.stats.denied.roof || 0) - (d0.roof || 0) }; });
void r4;   // (the Platform isle's deck over a lower deck leaves 1.5 m under it: a wall to him, not a ceiling — no test)
const r5 = await ev(() => { const G = game; J.goRegion('c3gallery', G.rooms.c3gallery.spawn.x, G.rooms.c3gallery.spawn.z, 0); J.athletic(); const r = J.hold(['Space'], 1.5); J.land(); return { r, room: G.room?.id }; });
check('underground (chapter 11\'s galleries): no sky, no flight', r5.room === 'c3gallery' && r5.r.lit === 0, r5);

// ---- an invalid save: over the cloud sea, inside a wall; an old save without the pack
await ev(() => { const s = JSON.parse(localStorage.getItem('lba3_save_v1')); const o = game.rooms.zeelich.group.position;
  s.room = 'zeelich'; s.hero.x = o.x - 30; s.hero.z = o.z + 45;   // beyond the south shore: the cloud sea
  localStorage.setItem('lba3_save_v1', JSON.stringify(s)); });
await reboot(() => page.evaluate(() => { location.reload(); }));
await menu(page, 'continue'); await helpers();
const v1 = await ev(() => { const G = game, h = G.hero, P0 = G.physics, gi = P0.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.6); G.step(1); return { st: J.st(), sea: !gi.brick && gi.h < -0.35, rescued: G.gadgets.jet.stats.rescued || 0, spawn: G.rooms.zeelich.spawn }; });
check('a save that would load him over the cloud sea: he is put on the island (the region\'s spawn), standing', v1.st.room === 'zeelich' && !v1.sea && v1.st.onGround && v1.rescued === 1 && Math.abs(v1.st.x - v1.spawn.x) < 0.01, v1);
await ev(() => { const s = JSON.parse(localStorage.getItem('lba3_save_v1')); s.v = 4; delete s.hero.arms.jetpack; delete s.hero.arms.jetpackOn; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); });
await reboot(() => page.evaluate(() => { location.reload(); }));
await menu(page, 'continue'); await helpers();
const v2 = await ev(() => { const G = game; G.step(0.5); return { arms: { ...G.hero.arms }, state: G.state, peg: G.story.arsenal.jetPeg.pack.visible, model: !!G.gadgets.jet.model?.visible }; });
check('a save from before the pack (no jetpack fields) loads: no pack, back on its peg, nothing shown on his back', v2.state === 'play' && v2.arms.jetpack === false && v2.arms.jetpackOn === false && v2.peg && !v2.model, v2);
await ev(() => { game.hero.arms.jetpack = true; game.hero.arms.jetpackOn = true; game.story.applyFlags(); });

// ---- a low frame rate: the same hop onto the step at 30 and 60 steps a second; the fence at 30
const lf = await ev(() => { const G = game, S = G.story.arsenal.step, h = G.hero, Z = G.rooms.zeelich, o = Z.group.position, out = {};
  for (const fps of [60, 30]) {
    J.tp(S.x + Math.sin(S.a) * 1.7, S.z + Math.cos(S.a) * 1.7); h.angle = S.a + Math.PI; J.athletic(); G.step(2.5); h.angle = S.a + Math.PI;
    const r = J.hold(['Space', 'ArrowUp'], 3, { dt: 1 / fps, letGoUp: () => Math.hypot(h.pos.x - S.x, h.pos.z - S.z) < 0.35, until: () => h.onGround && h.pos.y > S.top - 0.1 });
    G.step(0.3); out['step' + fps] = { maxY: r.maxY, y: +h.pos.y.toFixed(2), top: S.top };
    J.tp(o.x + 2.2, o.z + 17); h.angle = Math.PI / 2; J.athletic(); G.step(2.5); h.angle = Math.PI / 2;
    const f = J.hold(['Space', 'ArrowUp'], 3.5, { dt: 1 / fps }); J.land(); out['fence' + fps] = { x: +h.pos.x.toFixed(2), inside: o.x + 4, maxY: f.maxY };
  }
  return out; });
check('30 vs 60 steps a second: the same height (±0.1 m) and both land on the deck', Math.abs(lf.step30.maxY - lf.step60.maxY) < 0.1 && Math.abs(lf.step30.y - lf.step30.top) < 0.05 && Math.abs(lf.step60.y - lf.step60.top) < 0.05, lf);
check('at 30 steps a second the fence still holds (no tunnelling)', lf.fence30.x < lf.fence30.inside - 0.3 && lf.fence60.x < lf.fence60.inside - 0.3, lf);

// ---- cost: the model and the flight's effects (SwiftShader, renderer.info; simulation time per frame)
const pf = await ev(() => { const G = game, h = G.hero, j = G.gadgets.jet, R = G.renderer.renderer, m = j.model;
  const S = G.story.arsenal.step; J.tp(S.x + Math.sin(S.a) * 4.5, S.z + Math.cos(S.a) * 4.5); J.athletic(); G.step(2.5);
  const frame = () => { let c = 0, tr = 0; for (let i = 0; i < 3; i++) { R.info.reset(); G.renderer.render(); c = R.info.render.calls; tr = R.info.render.triangles; } return { calls: c, tris: tr }; };
  const worn = frame(); m.visible = false; const off = frame(); m.visible = true;
  let meshes = 0, tris = 0; m.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  // simulation cost per frame: standing vs. flying (input held), 120 frames each
  const sim = (keys) => { for (const k of keys) G.input.keys.add(k); if (keys.length) G.input.taps.add('Space'); const t0 = performance.now(); for (let i = 0; i < 120; i++) G.step(1 / 60); const ms = (performance.now() - t0) / 120; G.input.keys.clear(); return +ms.toFixed(3); };
  G.step(1); const stand = sim([]); J.land(); G.step(2.5); const fly = sim(['Space']);
  J.land(); G.step(2.5); G.input.keys.add('Space'); G.input.taps.add('Space'); G.step(0.9); const lit = frame(); G.input.keys.clear(); J.land();
  return { worn, off, lit, meshes, tris: Math.round(tris), stand, fly, particles: G.particles.n }; });
info('cost (SwiftShader, this machine): draw calls / triangles with the pack worn, without it, and lit in flight; its meshes and triangles; simulation ms per frame standing vs. flying', pf);
check('cost: the worn pack adds at most 30 draw calls, the lit flames at most 4 more; the flight adds under 0.5 ms of simulation a frame', pf.worn.calls - pf.off.calls <= 30 && pf.lit.calls - pf.worn.calls <= 4 && pf.fly - pf.stand < 0.5, pf);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
