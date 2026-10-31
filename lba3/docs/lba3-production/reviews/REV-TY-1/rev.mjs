// REV-TY-1 review runner (independent of tests/townlife.mjs). node rev.mjs <scenario>
// Scenarios: pro (new game, prologue), ch2 (LOAD=<save at start of 'project'>, both side stories by input),
// hot (LOAD=<save>, save while the coupler is hot / death by the hot coupler), evac (ISO flags: evacuation lines),
// house (LOAD=<save>: house looks for the save's story state). Screenshots → SHOTS dir.
// GAME_URL selects the server. Uses the input harness tests/lib/player.js (window.P).
import { launch, open, menu, quitAndKeep } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const SC = process.argv[2];
const SHOTS = path.join(DIR, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const out = {};
const log = (k, v) => { out[k] = v; console.log(k + ': ' + JSON.stringify(v)?.slice(0, 900)); };
const { browser, context, page, errs } = await launch({ storageState: process.env.LOAD, width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const boot = async (act) => { await open(page, '?nocine'); await menu(page, act); await ev(() => P.settle()); await hook(); };
const hook = () => ev(() => { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines.map((l) => (n ? n + ': ' : '') + l)); return sv.call(this, n, lines, ...a); };
  const tv = game.hud.toast.bind(game.hud); game.hud.toast = (k, ...a) => { window._said.push('TOAST ' + k); return tv(k, ...a); }; });
const said = () => ev(() => { const s = window._said.slice(); window._said.length = 0; return s; });
const shot = async (name) => { await ev(() => { game.step(1 / 30); game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, `${SC}-${name}.png`) }); };
const st = () => ev(() => ({ ...P.state(), cs: game.flags.l_cs, items: game.story.items().map((i) => i.id), coins: game.hero.coins, clovers: game.hero.clovers, l: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('l_'))) }));
const homeAll = async (tag) => {
  const res = {};
  for (const w of ['desk', 'trunk', 'mend', 'meter', 'bench']) {
    const r = await ev((w) => { const H = game.rooms.house.life; const p = { desk: H.zoeDesk, trunk: H.trunk, mend: H.mendBox, meter: H.meter, bench: H.bench }[w];
      // a player walks up and presses E at whatever the prompt shows (no kind filter)
      const u = P.use(p.x, p.z, { near: 0.5 }); return { r: u.r, target: u.target?.kind, label: u.target?.label }; }, w);
    r.lines = await said();
    await shot(`${tag}-house-${w}`);
    res[w] = r;
  }
  return res;
};

try {
  if (SC === 'pro') {
    await boot('new');
    log('start', await st());
    log('house-prologue', await homeAll('pro'));
    // outdoors: the boat box in the prologue (is the side story open early?)
    log('cupboard', await ev(() => { const s = game.room.searches[0]; const r = P.use(s.x, s.z); return { r: r.r, ball: game.hero.hasBall }; })); await said();
    log('exit', await ev(() => { const e = game.room.exits.find((x) => !x.room); return P.through(e.x, e.z); }));
    const L = await ev(() => { const L = game.world.life; return { pump: [L.pump.x, L.pump.z], box: [L.boatBox.x, L.boatBox.z], crate: [L.crate.x, L.crate.z], bench: [L.shop.bench.x, L.shop.bench.z] }; });
    log('life spots', L);
    log('pump look', await ev(() => { const L = game.world.life; return P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); }));
    log('pump look lines', await said()); await shot('pump-dry');
    log('bram', await ev(() => P.talk('bram'))); log('bram lines', await said());
    log('boat box (prologue)', await ev(() => { const L = game.world.life; const r = P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); return { r: r.r, target: r.target, pliers: !!game.flags.l_pliers, items: game.story.items().map((i) => i.id) }; }));
    log('boat box lines', await said()); await shot('boatbox-prologue');
    // the pipe across the lane: does he walk through it? (no collider on the pipe itself)
    log('pipe crossing', await ev(() => { const L = game.world.life, px = L.pump.x - 1.5, z = L.pump.z + 3.5; P.go(px + 1.2, z, { tol: 0.3 }); const a = P.go(px - 1.2, z, { tol: 0.3 }); const h = game.hero; return { r: a.r, t: +a.t.toFixed(2), x: +h.pos.x.toFixed(2), y: +h.pos.y.toFixed(2), pipeTop: +(game.physics.groundAt(px, z) + 0.39).toFixed(2), ground: +game.physics.groundAt(px, z).toFixed(2) }; }));
    await ev(() => { const L = game.world.life, px = L.pump.x - 1.5, z = L.pump.z + 3.5; P.go(px + 1.0, z, { tol: 0.2 }); P.face(px - 3, z); P.holdFor(['ArrowUp'], 0.45); });
    await shot('pipe-clip');
    log('odile', await ev(() => P.talk('odile'))); log('odile lines', await said());
    await shot('customs-prologue');
    log('crate (prologue)', await ev(() => { const L = game.world.life; game.step(0.1); const it = (() => { P.go(L.crate.x, L.crate.z, { tol: 0.6 }); P.face(L.crate.x, L.crate.z - 1.2); return P.target(); })(); return it; }));
    log('nell', await ev(() => P.talk('nell'))); log('nell lines', await said());
    await shot('shop-prologue');
    log('end', await st());
  }

  if (SC === 'ch2') {
    await boot('continue');
    log('start', await st());
    // ---- shipment, order: Nell first, the crate before Odile, Odile, the crate
    log('nell first', await ev(() => P.talk('nell'))); log('nell first lines', await said());
    log('crate before odile', await ev(() => { const L = game.world.life; const r = P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); return { r: r.r, open: !!game.flags.l_crateOpen }; }));
    log('crate before odile lines', await said());
    log('odile', await ev(() => P.talk('odile'))); log('odile lines', await said());
    await shot('customs-held');
    log('crate open', await ev(() => { const L = game.world.life; const r = P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); return { r: r.r, open: !!game.flags.l_crateOpen, cs: game.flags.l_cs, items: game.story.items().map((i) => i.id), tag: L.crate.state }; }));
    log('crate open lines', await said()); await shot('crate-opened');
    log('odile while carrying', await ev(() => P.talk('odile'))); log('odile carrying lines', await said());
    log('nell with coupler', await ev(() => P.talk('nell'))); log('nell coupler lines', await said());
    log('bench place', await ev(() => { const L = game.world.life; const r = P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); return { r: r.r, cs: game.flags.l_cs, heat: game.story.life.heat }; }));
    log('bench place lines', await said()); await shot('coupler-on-bench');
    log('take too early', await ev(() => { P.wait(1); const L = game.world.life; const r = P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); return { cs: game.flags.l_cs, heat: +game.story.life.heat.toFixed(3) }; }));
    log('take too early lines', await said());
    // pause while heating: the heat must not advance
    log('pause during heat', await ev(() => { const h0 = game.story.life.heat; P.tap('Escape', 0.1); const s1 = game.state; P.wait(20); const h1 = game.story.life.heat; P.tap('Escape', 0.1); const s2 = game.state; P.wait(0.2); return { s1, s2, h0: +h0.toFixed(3), h1: +h1.toFixed(3), cs: game.flags.l_cs }; }));
    log('glow', await ev(() => { let t = 0; while (game.story.life.heat < 0.46 && t < 15) { P.wait(0.1); t += 0.1; } return { t: +t.toFixed(1), heat: +game.story.life.heat.toFixed(2), cs: game.flags.l_cs }; }));
    await shot('coupler-glowing'); log('glow lines', await said());
    // take it and stand still holding it: too hot to hold → dropped, 1 damage
    log('hold too long', await ev(() => { const L = game.world.life, h = game.hero; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const took = game.flags.l_cs, hp0 = h.hp; P.wait(10); return { took, after: game.flags.l_cs, hp: [hp0, h.hp], visible: L.shop.coupler.visible }; }));
    log('hold too long lines', await said());
    // again, properly: place, glow, take, walk to the barrel, cool
    log('restart', await ev(() => { const L = game.world.life; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const c0 = game.flags.l_cs; let t = 0; while (game.story.life.heat < 0.46 && t < 15) { P.wait(0.1); t += 0.1; } P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const t0 = game.time; const took = game.flags.l_cs; const r = P.use(L.shop.barrel.x, L.shop.barrel.z, { near: 0.8, kind: 'lbarrel' }); return { c0, took, toBarrel: +(game.time - t0).toFixed(2), cs: game.flags.l_cs, items: game.story.items().map((i) => i.id) }; }));
    log('restart lines', await said()); await shot('barrel-cooled');
    // save & quit while carrying the cooled coupler, Continue
    await quitAndKeep(page, context, path.join(DIR, 'save-ch2-cooled.json'));
    await boot('continue');
    log('continue (cooled)', await st());
    log('bench settle', await ev(() => { const L = game.world.life; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.settle(); return { cs: game.flags.l_cs, coupler: !!game.flags.l_coupler, nellAnim: P.npc('nell').forceAnim ?? P.npc('nell').anim }; }));
    log('bench settle lines', await said()); await shot('engine-runs');
    log('nell before clearing', await ev(() => { const c0 = game.hero.coins; const r = P.talk('nell'); P.wait(1.5); return { r: r.r, paid: !!game.flags.l_nellPaid, coins: game.pickups.list.filter((p) => p.type === 'coin' && !p.id).length }; }));
    log('nell before clearing lines', await said());
    log('odile clears', await ev(() => { const r = P.talk('odile'); const L = game.world.life; return { r: r.r, cleared: !!game.flags.l_cleared, tag: L.crate.state, barrier: +L.customs.barrier.rotation.z.toFixed(2) }; }));
    log('odile clears lines', await said()); await shot('crate-cleared');
    log('nell pays', await ev(() => { const c0 = game.hero.coins; P.talk('nell'); P.wait(1.5); const loose = game.pickups.list.filter((p) => p.type === 'coin' && !p.id); const n = loose.length; for (const p of [...loose]) P.go(p.pos.x, p.pos.z, { tol: 0.3, maxT: 10 }); P.wait(1); return { coins: [c0, game.hero.coins], spawned: n, left: game.pickups.list.filter((p) => p.type === 'coin' && !p.id).length }; }));
    log('nell pays lines', await said());
    log('nell again', await ev(() => { P.talk('nell'); P.wait(1.5); return { spawned: game.pickups.list.filter((p) => p.type === 'coin' && !p.id).length }; }));
    log('nell again lines', await said());
    // ---- the pump, order: Bram → pump (no pliers) → straight to the boat box (Arthur never asked) → pump
    log('bram', await ev(() => P.talk('bram'))); log('bram lines', await said());
    log('pump no pliers', await ev(() => { const L = game.world.life; P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); return { need: !!game.flags.l_needPliers, journal: game.story.journal().find((j) => j.title === 'Around town')?.lines }; }));
    log('pump no pliers lines', await said());
    log('boat box', await ev(() => { const L = game.world.life; P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); return { pliers: !!game.flags.l_pliers, items: game.story.items().map((i) => i.id) }; }));
    log('boat box lines', await said()); await shot('boatbox');
    log('pump fix', await ev(() => { const L = game.world.life, f = game.flags; P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); const pin = !!f.l_pin; let presses = 0; for (let i = 0; i < 8 && !f.l_pump; i++) { P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); presses++; } return { pin, presses, strokes: f.l_strokes, pump: !!f.l_pump, running: L.pump.running, items: game.story.items().map((i) => i.id) }; }));
    log('pump fix lines', await said()); await shot('pump-runs');
    log('arthur after pliers found', await ev(() => P.talk('arthur'))); log('arthur lines', await said());
    log('bram thanks', await ev(() => { const c0 = game.hero.clovers; P.talk('bram'); P.wait(1.5); const cl = game.pickups.list.filter((p) => p.type === 'clover' && !p.id); const n = cl.length; for (const p of [...cl]) P.go(p.pos.x, p.pos.z, { tol: 0.3, maxT: 10 }); P.wait(1); return { spawned: n, clovers: [c0, game.hero.clovers], left: game.pickups.list.filter((p) => p.type === 'clover' && !p.id).length }; }));
    log('bram thanks lines', await said());
    log('bram again x3', await ev(() => { const n = []; for (let i = 0; i < 3; i++) { P.talk('bram'); P.wait(1); n.push(game.pickups.list.filter((p) => p.type === 'clover' && !p.id).length); } return n; }));
    log('bram again lines', await said());
    log('drink', await ev(() => { const h = game.hero; h.hp = Math.max(1, h.maxHp - 5); const a = h.hp; const L = game.world.life; P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); const b = h.hp; P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); return { hp: [a, b, h.hp], max: h.maxHp, note: 'ISO: hp lowered to test the heal' }; }));
    log('drink lines', await said());
    log('journal', await ev(() => game.story.journal().find((j) => j.title === 'Around town')));
    await quitAndKeep(page, context, path.join(DIR, 'save-ch2-done.json'));
    await boot('continue');
    log('continue (done)', await ev(() => { const L = game.world.life; return { pump: L.pump.running, crate: L.crate.state, cs: game.flags.l_cs, coupler: L.shop.coupler.visible, barrier: +L.customs.barrier.rotation.z.toFixed(2), items: game.story.items().map((i) => i.id), coins: game.hero.coins, clovers: game.hero.clovers }; }));
    log('after reload: talk bram/nell/odile', await ev(() => { const r = {}; for (const id of ['bram', 'nell', 'odile']) { P.talk(id); P.wait(1); } r.loose = game.pickups.list.filter((p) => !p.id && (p.type === 'coin' || p.type === 'clover')).length; return r; }));
    log('after reload lines', await said());
    await ev(() => { const L = game.world.life; P.go(L.pump.x + 2.5, L.pump.z + 3, { tol: 0.5 }); P.face(L.pump.x, L.pump.z); });
    await shot('pump-after-reload');
    log('end', await st());
  }

  if (SC === 'hot') {
    await boot('continue');
    log('start', await st());
    log('prep: odile + crate', await ev(() => { const L = game.world.life; if (!game.flags.l_crateOpen) { P.talk('odile'); P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); } return game.flags.l_cs; })); await said();
    log('to hot', await ev(() => { const L = game.world.life; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); let t = 0; while (game.story.life.heat < 0.46 && t < 15) { P.wait(0.1); t += 0.1; } P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); return { cs: game.flags.l_cs, items: game.story.items().map((i) => i.id) }; }));
    await quitAndKeep(page, context, path.join(DIR, 'save-hot.json'));
    await boot('continue');
    log('continue (saved hot)', await ev(() => ({ cs: game.flags.l_cs, items: game.story.items().map((i) => i.id), visible: game.world.life.shop.coupler.visible, engine: null })));
    // at 1 HP, holding it too long (ISO: hp set to 1 to isolate)
    log('hold at 1 hp', await ev(() => { const L = game.world.life, h = game.hero; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); let t = 0; while (game.story.life.heat < 0.46 && t < 15) { P.wait(0.1); t += 0.1; } P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); h.hp = 1; P.wait(10); for (let i = 0; i < 120 && h.dead && game.state !== 'gameover'; i++) game.step(1 / 30); return { cs: game.flags.l_cs, hp: h.hp, dead: !!h.dead, state: game.state }; }));
    log('hold at 1 hp lines', await said()); await shot('hot-death');
    // carrying it hot through a door (the house is far; the nearest room door from the quay)
    log('end', await st());
  }

  if (SC === 'hotroom') {
    await boot('continue');
    log('prep: odile + crate', await ev(() => { const L = game.world.life; if (!game.flags.l_crateOpen) { P.talk('odile'); P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); } return game.flags.l_cs; })); await said();
    log('doors near the shop', await ev(() => { const L = game.world.life; return game.story.doors().filter((d) => !d.region).map((d) => ({ room: d.room, d: +Math.hypot(d.x - L.shop.bench.x, d.z - L.shop.bench.z).toFixed(1) })).sort((a, b) => a.d - b.d).slice(0, 4); }));
    log('hot into a room', await ev(() => { const L = game.world.life; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); let t = 0; while (game.story.life.heat < 0.46 && t < 15) { P.wait(0.1); t += 0.1; } P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const took = game.flags.l_cs; const d = game.story.doors().filter((d) => !d.region).sort((a, b) => Math.hypot(a.x - L.shop.bench.x, a.z - L.shop.bench.z) - Math.hypot(b.x - L.shop.bench.x, b.z - L.shop.bench.z))[0]; const t0 = game.time; const r = P.enter(d.room, { run: true }); return { took, room: game.room?.id, t: +(game.time - t0).toFixed(1), cs: game.flags.l_cs, hp: game.hero.hp }; }));
    log('hot into a room lines', await said());
  }


  if (SC === 'access') {
    await boot('continue');
    log('start', await st());
    // around each new place: walkable points on a ring (r 2.5 and 4 m) → walk there from the place's use spot and back
    const areas = await ev(() => { const L = game.world.life; const xz = (o) => ({ x: o.x, z: o.z }); return { pump: { x: L.pump.x, z: L.pump.z + 1.6 }, trough: { x: L.trough.x, z: L.trough.z + 1.0 }, bram: { x: L.spots.bram.x, z: L.spots.bram.z - 1.0 }, garden: xz(L.boatBox), customs: xz(L.customs), crate: xz(L.crate), shop: xz(L.shop.bench), barrel: xz(L.shop.barrel), engine: xz(L.shop.engine) }; }).then((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { x: v.x, z: v.z }])));
    page.on('crash', () => console.log('PAGE CRASH ' + new Date().toISOString())); browser.on('disconnected', () => console.log('BROWSER DISCONNECTED ' + new Date().toISOString()));
    for (const [name, c] of Object.entries(areas)) { if (process.env.AREAS && !process.env.AREAS.split(',').includes(name)) continue;
      for (let k = 0; k < 40; k++) { const r = await ev(([c]) => P.go(c.x, c.z, { tol: 0.6, maxT: 4 }).r, [c]); if (r === 'arrived') break; }
      const pts = await ev(([c]) => { const PH = game.physics; const out = [];
        for (const R of [2.5, 4]) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = c.x + Math.sin(a) * R, z = c.z + Math.cos(a) * R; const y = PH.groundAt(x, z, game.hero.pos.y + 1); if (PH.steepAt(x, z, y) || PH.blockedAt(x, z, y, 0.45) || Math.abs(y - game.hero.pos.y) > 1.5) continue; out.push([x, z, i, R]); }
        return out; }, [c]);
      const bad = []; let ok = 0;
      for (const [x, z, i, R] of pts) {
        console.log('  ' + name + ' → ' + i + '/' + R);
        const r = await ev(([x, z, c]) => { const g1 = P.go(x, z, { tol: 0.5, maxT: 30 }); const g2 = P.go(c.x, c.z, { tol: 0.6, maxT: 30 }); return { out: g1.r, back: g2.r, st: game.state, hp: game.hero.hp, at: [game.hero.pos.x, game.hero.pos.y, game.hero.pos.z].map((v) => +v.toFixed(1)) }; }, [x, z, c]);
        if (r.out === 'arrived' && r.back === 'arrived') ok++; else bad.push({ i, R, ...r });
      }
      log('ring ' + name, { tried: pts.length, ok, bad });
    }
    // the footpaths through the new places: along the dirt path past the beds, and the path through Nell's shop
    log('path past garden beds', await ev(() => { const L = game.world.life; const a = P.go(L.boatBox.x - 3.5, L.boatBox.z - 9, { tol: 0.6, maxT: 60 }); const t0 = game.time; const b = P.go(L.boatBox.x - 3.5, L.boatBox.z + 3, { tol: 0.6, maxT: 60 }); return { a: a.r, b: b.r, t: +(game.time - t0).toFixed(1) }; }));
    log('path through shop', await ev(() => { const L = game.world.life, s = L.shop.bench; const a = P.go(s.x + 0.6, s.z - 6, { tol: 0.6, maxT: 60 }); const t0 = game.time; const b = P.go(s.x + 0.6, s.z + 5, { tol: 0.6, maxT: 60 }); return { a: a.r, b: b.r, t: +(game.time - t0).toFixed(1) }; }));
    // colliders: pipe, barrier post, rope posts, sign post: can he stand inside them?
    log('walk-through props', await ev(() => { const L = game.world.life, PH = game.physics, y = (x, z) => PH.groundAt(x, z, game.hero.pos.y + 1);
      const pts = { pipe: [L.pump.x - 1.5, L.pump.z + 3.5], pumpSign: [L.pump.x - 0.75, L.pump.z + 0.45], barrierPost: [L.customs.x + 1.3, L.customs.z - 1.6 + 0.3], ropePostSW: [L.crate.x - 0.9, L.crate.z - 1.2 + 0.75], shopRoofPole: [L.shop.bench.x - 1.3 - 0.1, L.shop.bench.z + 0.15 + 1.55], benchTop: [L.shop.bench.x + 0.75, L.shop.bench.z + 0.15] };
      return Object.fromEntries(Object.entries(pts).map(([k, [x, z]]) => [k, { blocked: PH.blockedAt(x, z, y(x, z), 0.05) }])); }));
  }


  if (SC === 'cast') {
    await boot('continue');
    for (const id of ['bram', 'odile', 'nell']) {
      for (let k = 0; k < 40; k++) { const r = await ev((id) => { const n = P.npc(id); return P.go(n.pos.x + 1.6, n.pos.z + 1.6, { tol: 0.5, maxT: 4 }).r; }, id); if (r === 'arrived') break; }
      log(id, await ev((id) => { const n = P.npc(id); P.face(n.pos.x, n.pos.z); return { anim: n.forceAnim ?? n.anim ?? null, pos: [n.pos.x, n.pos.z].map((v) => +v.toFixed(2)), char: n.def.char }; }, id));
      await shot('npc-' + id);
      const box = await ev((id) => { const n = P.npc(id), v = n.pos.clone(); v.y += 0.9; v.project(game.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, id).catch(() => null);
      log(id + ' screen', box);
    }
  }


  if (SC === 'loss') {
    await boot('continue');
    log('to done + cleared', await ev(() => { const L = game.world.life; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.settle(); P.talk('odile'); return { cs: game.flags.l_cs, cleared: !!game.flags.l_cleared, coins: game.hero.coins }; }));
    log('nell pays, then quit at once', await ev(() => { const c0 = game.hero.coins; P.talk('nell'); return { c0, c1: game.hero.coins, loose: game.pickups.list.filter((p) => p.type === 'coin' && !p.id).length, paid: !!game.flags.l_nellPaid }; }));
    await quitAndKeep(page, context, path.join(DIR, 'save-loss.json'));
    await boot('continue');
    log('after continue', await ev(() => { P.wait(2); return { coins: game.hero.coins, loose: game.pickups.list.filter((p) => p.type === 'coin' && !p.id).length, paid: !!game.flags.l_nellPaid }; }));
    log('nell again', await ev(() => { P.talk('nell'); P.wait(2); return { coins: game.hero.coins }; }));
  }

  if (SC === 'evac') {
    await boot('continue');
    const setChapter = (key, extra = {}) => ev(([key, extra]) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.applyFlags(); }, [key, extra]);
    await setChapter('evacuation', { c1_water: true, c1_plan: true });
    log('ISO', 'chapter set to evacuation by flags (c1_water, c1_plan)');
    log('present', await ev(() => ['bram', 'odile', 'nell'].map((id) => ({ id, present: P.npc(id)?.present }))));
    for (const id of ['bram', 'odile', 'nell']) { log('talk ' + id, await ev((id) => P.talk(id), id)); log(id + ' lines', await said()); }
    await ev(() => { const L = game.world.life; P.go(L.pump.x + 2.5, L.pump.z + 3, { tol: 0.5 }); P.face(L.pump.x, L.pump.z); });
    await shot('evac-pump');
    log('end', await st());
  }

  if (SC === 'house') {
    await boot('continue');
    log('start', await st());
    log('house', await homeAll(process.env.TAG || 'house'));
  }
} catch (e) { log('ERROR', e.message.split('\n').slice(0, 3).join(' | ')); }
log('errors', errs.slice(0, 20));
fs.writeFileSync(path.join(DIR, `rev-${SC}${process.env.TAG ? '-' + process.env.TAG : ''}.json`), JSON.stringify(out, null, 1));
console.log((await ev(() => P.trace.slice(-15)).catch(() => [])).join('\n'));
await browser.close();
