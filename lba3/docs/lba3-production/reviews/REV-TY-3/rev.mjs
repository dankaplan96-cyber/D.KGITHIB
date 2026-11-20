// REV-TY-3 review runner (independent of tests/townlife.mjs and tests/workshop.mjs). node rev.mjs <scenario>
// GAME_URL selects the server; LOAD=<storage.json> continues from a real (isolated) save; KEEP=<file> keeps a save at
// the end. Input harness: tests/lib/player.js (window.P). Screenshots -> shots/<scenario>-*.png (cited ones are
// converted to JPEG afterwards, the rest deleted). Every non-input setup is printed with an "ISO" prefix.
// Scenarios:
//   pro     new game (input): house board/meter in the prologue, out of the house, the boat box, the pump.
//   ch2     LOAD = REV-TY-1/save-02.json (chapter 2 start, a real save): the house (stage 1, Arthur's bench), The Old
//           Pump by input (prompt distance, the step to the grip, hands through the stroke, E spam), Bram's clover,
//           The Mislabelled Shipment by input with the shop seen from the paths, Nell pays -> Save & quit at once.
//   ch2b    LOAD = the save kept by ch2 (Nell's coins owed): Continue, coins given once; talk again; collisions;
//           pump/shop/garden views from the lanes.
//   evac    ISO (flags): the evacuation's board (stage 2) and Bram's line.
//   race    LOAD = REV-TY-2/save-ready.json (0.25.0, hoist up, tap open, pair off). RACE=crank|tap|lever pressed at
//           sync >= 0.985; then Save & quit / Continue.
//   tapshut LOAD = save-ready: tap shut at sync ~0.45; then reopened, success; coin left on the floor, out of the
//           workshop and back, picked up; Save & quit / Continue: no second coin.
//   contra  LOAD = REV-TY-2/save-race-crank.json (a 0.25.0 save left contradictory): Continue.
//   oldloss LOAD = a 0.24.0/0.25.0 save made before a reward was picked up: Continue.
//   pre     LOAD = REV-TY-2/save-05.json (Zeelich arrival): into the workshop before Baldino's hello.
//   crate   LOAD = save-ready: Ilo's crate from the north side (REV-TY-2 D6's repro).
//   cradle  LOAD = save-ready: the lowered cradle; walking under it while it comes down.
//   ch10    ISO (flags, as tests/chapter10.mjs): chapter 10's opening lines with and without the pair (PAIR=1).
import { launch, open, menu, quitAndKeep } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const SC = process.argv[2];
const SHOTS = path.join(DIR, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const out = {};
const log = (k, v) => { out[k] = v; console.log(k + ': ' + JSON.stringify(v)?.slice(0, 1600)); };
const iso = (s) => { console.log('ISO  ' + s); };
const { browser, context, page, errs } = await launch({ storageState: process.env.LOAD, width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const hook = () => ev(() => { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines.map((l) => (n ? n + ': ' : '') + (Array.isArray(l) ? l.join(':') : l))); return sv.call(this, n, lines, ...a); };
  const tv = game.hud.toast.bind(game.hud); game.hud.toast = (k, ...a) => { window._said.push('TOAST ' + k + (a[0] ? ' ' + JSON.stringify(a[0]) : '')); return tv(k, ...a); }; });
const boot = async (act) => { await open(page, '?nocine'); await menu(page, act); const t = await ev(() => [...game.hud.toastEl.children].map((c) => c.textContent)); await ev(() => P.settle()); await hook(); return t; };
const said = () => ev(() => { const s = window._said.slice(); window._said.length = 0; return s; });
const shot = async (name) => { await ev(() => { game.step(1 / 30); game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, `${SC}-${name}.png`) }); };
const shotNow = async (name) => { await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, `${SC}-${name}.png`) }); };
const st = () => ev(() => ({ ...P.state(), coins: game.hero.coins, clovers: game.hero.clovers, owe: Object.fromEntries(Object.entries(game.flags).filter(([k]) => /owe/i.test(k))), lying: game.pickups.list.filter((p) => p.owe).map((p) => p.owe + ':' + p.type) }));
const ws = () => ev(() => { const L = game.rooms.workshop.life, f = game.flags, W = game.story.workshop; return { on: W.on, heat: +W.heat.toFixed(2), sync: +W.sync.toFixed(3), lift: +L.lift.toFixed(2), up: !!f.w_up, tap: !!f.w_tap, pair: !!f.w_pair, paid: !!f.w_paid, owe: f.w_owe || 0, trips: f.w_trips || 0, room: game.room?.id ?? 'citadel', coins: game.hero.coins, lying: game.pickups.list.filter((p) => p.owe === 'w_owe').length, state: game.state, chapter: f.chapterKey }; });
const useSpot = (what, kind = null) => ev(([what, kind]) => { const s = game.rooms.workshop.life.spots[what]; const r = P.use(s.x, s.z, { near: 0.5, kind }); return { r: r.r, tgt: r.target?.kind, label: r.target?.label }; }, [what, kind]);

// readability: is each world point on screen, and is it the first thing a ray from the normal camera meets?
const vis = (pts) => ev(async (pts) => {
  const THREE = await import('three');
  game.renderer.render?.();
  const cam = game.camera, cp = new THREE.Vector3(); cam.getWorldPosition(cp);
  const rc = new THREE.Raycaster();
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const owner = (o) => { for (let x = o; x; x = x.parent) { if (x === game.hero.rig?.root || x === game.hero.mesh) return 'TWINSEN'; for (const n of game.npcs) if (x === n.rig?.root || x === n.mesh) return 'NPC:' + n.def.id; } return null; };
  const meshes = []; game.scene.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) && !o.isSprite && shown(o)) meshes.push(o); });
  rc.camera = cam;
  const res = {};
  for (const [n, p] of Object.entries(pts)) {
    const v = new THREE.Vector3(p[0], p[1], p[2]);
    const ndc = v.clone().project(cam);
    const on = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z < 1;
    const dir = v.clone().sub(cp), d = dir.length(); dir.normalize();
    rc.set(cp, dir); rc.far = d + 0.3;
    const hits = rc.intersectObjects(meshes, false).filter((h) => !(h.object.material?.transparent && (h.object.material.opacity < 0.6 || h.object.material.depthWrite === false)));
    const first = hits[0];
    const blocked = first && first.distance < d - 0.2;
    const bp = first?.point;
    res[n] = on ? (blocked ? 'HIDDEN by ' + (owner(first.object) || (first.object.isInstancedMesh ? 'instanced(' + first.object.geometry.attributes.position.count + 'v)' : (first.object.name || first.object.geometry?.type || 'mesh'))) + ' @' + [bp.x, bp.y, bp.z].map((q) => q.toFixed(1)).join(',') : 'seen') : 'off-screen';
  }
  return res;
}, pts);

try {
  // ======================================================================================== prologue (input)
  if (SC === 'pro') {
    await boot('new');
    log('start', await st());
    log('house stage', await ev(() => game.rooms.house.life.stage));
    log('desk look', await ev(() => { const H = game.rooms.house.life; const u = P.use(H.zoeDesk.x, H.zoeDesk.z, { near: 0.5 }); return { r: u.r, kind: u.target?.kind }; })); log('desk lines', await said());
    await shot('board-stage0');
    log('cupboard', await ev(() => { const s = game.room.searches[0]; const r = P.use(s.x, s.z); return { r: r.r, ball: game.hero.hasBall }; })); await said();
    log('exit', await ev(() => { const e = game.room.exits.find((x) => !x.room); return P.through(e.x, e.z); }));
    log('boat box (prologue, walked to)', await ev(() => { const L = game.world.life; const r = P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); return { r: r.r, label: r.target?.label, pliers: !!game.flags.l_pliers, items: game.story.items().map((i) => i.id), journal: game.story.journal().find((j) => j.title === 'Around town')?.lines || null }; }));
    log('boat box lines', await said());
    await shot('boatbox');
    log('boat box again', await ev(() => { const L = game.world.life; const r = P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); return { pliers: !!game.flags.l_pliers }; })); log('again lines', await said());
    log('pump (prologue)', await ev(() => { const L = game.world.life; const r = P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); return { r: r.r, label: r.target?.label, pin: !!game.flags.l_pin }; })); log('pump lines', await said());
    log('end', await st());
  }

  // ======================================================================================== chapter 2 (real save)
  if (SC === 'ch2') {
    await boot('continue');
    log('start', await st());
    // ---- the house: board/meter at stage 1, Arthur's bench from the house camera
    log('enter house', await ev(() => { const r = P.enter('house'); P.settle(); return { r: r.r, stage: game.rooms.house.life.stage }; }));
    for (const w of ['desk', 'meter', 'bench']) {
      log('house ' + w, await ev((w) => { const H = game.rooms.house.life; const p = { desk: H.zoeDesk, meter: H.meter, bench: H.bench }[w]; const u = P.use(p.x, p.z, { near: 0.5 }); return { r: u.r, kind: u.target?.kind, at: P.state().pos }; }, w));
      log('house ' + w + ' lines', await said());
      await ev(() => P.wait(0.6));
      if (w === 'bench') {
        // the bench top, the boat, the plans on the wall (world points derived from the room's bench spot)
        const pts = await ev(() => { const b = game.rooms.house.life.bench; return { bench_top: [b.x - 0.8, 0.8, b.z], boat: [b.x - 0.8, 0.85, b.z + 0.15], plans: [b.x - 1.1, 1.45, b.z + 0.25] }; });
        log('vis@bench (Twinsen at it)', await vis(pts));
        await shot('house-bench');
        // and from the room's door side (where he comes in)
        await ev(() => { const R = game.rooms.house; P.go(R.spawn.x, R.spawn.z, { tol: 0.6 }); P.wait(0.8); });
        log('vis@bench (from the house door)', await vis(pts));
        await shot('house-bench-from-door');
      } else await shot('house-' + w);
    }
    log('exit house', await ev(() => { const e = game.room.exits.find((x) => !x.room); return P.through(e.x, e.z); }));

    // ---- The Old Pump by input
    log('bram', await ev(() => P.talk('bram').r)); log('bram lines', await said());
    log('pump no pliers', await ev(() => { const L = game.world.life; const r = P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); return { r: r.r, need: !!game.flags.l_needPliers }; })); log('pump lines', await said());
    log('arthur', await ev(() => P.talk('arthur').r)); log('arthur lines', await said());
    log('boat box', await ev(() => { const L = game.world.life; const r = P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); return { r: r.r, pliers: !!game.flags.l_pliers }; })); log('box lines', await said());
    // the valve pin from the trough side (east), as a player coming from the house might
    const pin = await ev(() => { const L = game.world.life, h = game.hero; P.go(L.pump.x + 1.0, L.pump.z + 1.1, { tol: 0.3 }); P.face(L.pump.x, L.pump.z); const tg = P.target(); P.tap('KeyE', 0.1); for (let k = 0; k < 120 && h.actT > 0; k++) game.step(1 / 30); P.settle();
      const after = P.target(); const out = { tg: tg && tg.kind + ':' + tg.label, pin: !!game.flags.l_pin, promptAfterPin: after ? after.kind + ':' + after.label : null, at: P.state().pos };
      // where a player would stand next: at Bram's side (north) and the trough side (east)
      P.go(L.spots.bram.x + 0.6, L.spots.bram.z + 0.6, { tol: 0.3 }); P.face(L.pump.x, L.pump.z); out.promptNorth = P.target() ? P.target().kind + ':' + P.target().label : null;
      P.go(L.pump.x + 1.0, L.pump.z - 1.0, { tol: 0.3 }); P.face(L.pump.x, L.pump.z); out.promptNE = P.target() ? P.target().kind + ':' + P.target().label : null;
      return out; });
    log('pin out (trough side)', pin); log('pin lines', await said());
    // the prompt distance from the handle's grip spot, approaching from each direction (this is the distance the
    // game then slides him over before the stroke)
    const appr = await ev(() => { const L = game.world.life, U = L.pump.use, h = game.hero, res = {};
      for (const [n, sx, sz] of [['from N (lane)', U.x, U.z - 5], ['from S (lane)', U.x, U.z + 5], ['from W', U.x - 4, U.z + 0.3], ['from E (trough side, round the plinth)', L.pump.x + 2.2, L.pump.z + 1.4], ['from NE (Bram)', L.spots.bram.x + 0.6, L.spots.bram.z]]) {
        P.go(sx, sz, { tol: 0.3 });
        const r = P.go(U.x, U.z, { tol: 0.05, stopWhen: () => P.target()?.label === 'p_pump' });
        res[n] = { r: r.r, d: +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(2), behaviour: h.behaviour };
      }
      return res; });
    log('prompt distance from the grip spot by approach', appr);
    // stroke 1: from the south along the lane (prompt as soon as it shows), per frame: position, anim, hands to grip,
    // feet (sliding while 'walk' plays?)
    const s1 = await ev(() => { const L = game.world.life, U = L.pump.use, h = game.hero, f = game.flags;
      P.go(U.x + 0.2, U.z + 4, { tol: 0.3 });
      P.go(U.x, U.z, { tol: 0.05, stopWhen: () => P.target()?.label === 'p_pump' });
      const bones = {}; h.rig.root.traverse((o) => { if (/^hand[LR]$/.test(o.name)) bones[o.name] = o; if (/foot/i.test(o.name)) bones[o.name] = o; });
      const wp = (o) => o.getWorldPosition(o.position.clone());
      const from = +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(2), s0 = f.l_strokes || 0;
      P.tap('KeyE', 0); const rows = [];
      for (let i = 0; i < 36; i++) { game.step(1 / 60); const g = L.pump.grip(); const hl = bones.handL && wp(bones.handL), hr = bones.handR && wp(bones.handR); const mid = hl && hr ? hl.clone().add(hr).multiplyScalar(0.5) : null;
        rows.push({ t: +(i / 60).toFixed(3), anim: h.rig.anim, aT: +(h.rig.actionT || 0).toFixed(2), pos: [+h.pos.x.toFixed(2), +h.pos.z.toFixed(2)], dU: +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(2), hands: mid ? +mid.distanceTo(g).toFixed(3) : null, handsY: mid ? +(mid.y - g.y).toFixed(2) : null, feet: Object.keys(bones).filter((k) => /foot/i.test(k)).map((k) => { const p = wp(bones[k]); return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; }) }); }
      for (let i = 0; i < 40 && h.actT > 0; i++) game.step(1 / 60);
      return { from, bones: Object.keys(bones), strokes: [s0, f.l_strokes], rows }; });
    log('stroke 1 (frames)', { from: s1.from, bones: s1.bones, strokes: s1.strokes });
    for (const r of s1.rows) console.log('   ', JSON.stringify(r));
    out['stroke1rows'] = s1.rows;
    // stroke 2: a capture sequence from the normal camera (step to the grip, the stroke)
    await ev(() => { const L = game.world.life, U = L.pump.use; P.go(U.x + 0.3, U.z + 2.2, { tol: 0.2 }); P.go(U.x, U.z, { tol: 0.05, stopWhen: () => P.target()?.label === 'p_pump' }); P.tap('KeyE', 0); });
    for (const [i, dt] of [[0, 0], [1, 0.1], [2, 0.15], [3, 0.15], [4, 0.15], [5, 0.15]]) { await ev((dt) => game.step(dt), dt); await shotNow('pump-stroke-' + i); }
    log('after stroke 2 by capture', await ev(() => ({ strokes: game.flags.l_strokes, pump: !!game.flags.l_pump })));
    await ev(() => { for (let i = 0; i < 60 && game.hero.actT > 0; i++) game.step(1 / 60); });
    // stroke 3 attempt with E hammered every 2 frames for 0.55 s from the first press (a player mashing E)
    const mash = await ev(() => { const L = game.world.life, U = L.pump.use, f = game.flags, s0 = f.l_strokes; let presses = 0;
      for (let i = 0; i < 33; i++) { if (i % 2 === 0 && game.state === 'play') { P.tap('KeyE', 0); presses++; } else game.step(1 / 60); }
      const mid = f.l_strokes; P.settle(); return { s0, mid, presses, end: f.l_strokes, pump: !!f.l_pump }; });
    log('E mashed', mash); log('pump lines', await said());
    const s3 = await ev(() => { const L = game.world.life, U = L.pump.use, f = game.flags; for (let i = 0; i < 6 && !f.l_pump; i++) { P.use(U.x, U.z, { near: 0.6, kind: 'lpump' }); } P.settle(); return { strokes: f.l_strokes, pump: !!f.l_pump, running: L.pump.running }; });
    log('pump runs', s3); log('lines', await said());
    await ev(() => P.wait(1)); await shot('pump-running');
    log('bram thanks + clover by input', await ev(() => { const h = game.hero, c0 = h.clovers; P.talk('bram'); const owed = game.flags.l_oweClover || 0; P.wait(1.5); const lying = game.pickups.list.filter((p) => p.owe === 'l_oweClover').length;
      for (let k = 0; k < 3; k++) for (const p of [...game.pickups.list]) if (p.owe === 'l_oweClover') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 }); P.settle();
      const got = h.clovers - c0; P.talk('bram'); P.wait(1.5); const again = game.pickups.list.filter((p) => p.type === 'clover').length; return { c0, owed, lying, got, oweAfter: game.flags.l_oweClover || 0, cloverPickupsAfterTalkAgain: again }; }));
    log('bram lines', await said());

    // ---- The Mislabelled Shipment by input
    log('odile', await ev(() => P.talk('odile').r)); log('odile lines', await said());
    log('crate', await ev(() => { const L = game.world.life; const r = P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); return { r: r.r, open: !!game.flags.l_crateOpen }; })); log('crate lines', await said());
    log('nell', await ev(() => P.talk('nell').r)); log('nell lines', await said());
    log('bench place', await ev(() => { const L = game.world.life; const r = P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); return { r: r.r, cs: game.flags.l_cs }; }));
    log('bench lines', await said());
    // points to read from the normal camera: the coupler, Nell's head, the bench top, the engine's fan, the sign
    const shopPts = await ev(() => { const L = game.world.life, c = L.shop.coupler, n = P.npc('nell'); return { coupler: [c.x, c.y + 0.15, c.z], nell_head: [n.pos.x, n.pos.y + 1.0, n.pos.z], bench_top: [L.shop.bench.x, c.y + 0.02, L.shop.bench.z - 0.7], engine: [L.shop.engine.x - 0.2, game.physics.groundAt(L.shop.engine.x, L.shop.engine.z) + 0.75, L.shop.engine.z - 0.9] }; });
    log('shop points', shopPts);
    await ev(() => P.wait(2.5));
    log('vis at the bench, heating (Twinsen at the bench)', await vis(shopPts)); await shot('shop-at-bench-heating');
    await ev(() => { let t = 0; while (game.story.life.heat < 0.5 && t < 10) { P.wait(0.1); t += 0.1; } });
    log('vis at the bench, glowing', await vis(shopPts)); await shot('shop-glowing');
    log('take + barrel + bench', await ev(() => { const L = game.world.life; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const took = game.flags.l_cs; P.use(L.shop.barrel.x, L.shop.barrel.z, { near: 0.8, kind: 'lbarrel' }); const cooled = game.flags.l_cs; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.settle(); return { took, cooled, done: game.flags.l_cs, coupler: !!game.flags.l_coupler }; }));
    log('shop lines', await said());
    await ev(() => P.wait(1)); await shot('engine-runs');
    log('odile clears', await ev(() => { const r = P.talk('odile'); return { r: r.r, cleared: !!game.flags.l_cleared, tag: game.world.life.crate.state }; })); log('odile lines', await said());
    log('crate after', await ev(() => { const L = game.world.life; const r = P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); return r.r; })); log('crate after lines', await said());
    log('nell pays', await ev(() => { const c0 = game.hero.coins; const r = P.talk('nell'); return { r: r.r, c0, paid: !!game.flags.l_nellPaid, owe: game.flags.l_oweFee || 0, lying: game.pickups.list.filter((p) => p.owe === 'l_oweFee').length }; }));
    log('nell pay lines', await said());
    // Save & quit at once (REV-TY-1 D5's repro): the coins are still in the air / on the ground
    const keep = process.env.KEEP || path.join(DIR, 'save-ch2-owed.json');
    await quitAndKeep(page, context, keep); console.log('kept', keep);
  }

  if (SC === 'ch2b') {
    const t0 = await boot('continue');
    log('toasts on Continue', t0);
    log('after Continue', await st());
    log('nell again (no second payment)', await ev(() => { const c0 = game.hero.coins; P.talk('nell'); P.wait(2); P.settle(); return { c0, c1: game.hero.coins, coinsLying: game.pickups.list.filter((p) => p.type === 'coin').length, owe: game.flags.l_oweFee || 0 }; }));
    log('nell lines', await said());
    // ---- the shop from the paths (normal camera): find path points 6-9 m from the shop, east and south-east
    const shopPts = await ev(() => { const L = game.world.life, c = L.shop.coupler, n = P.npc('nell'); return { coupler: [c.x, c.y + 0.15, c.z], nell_head: [n.pos.x, n.pos.y + 1.6, n.pos.z], bench_top: [L.shop.bench.x, c.y + 0.02, L.shop.bench.z - 0.7] }; });
    const spots = await ev(() => { const W = game.world, s = { x: -102.8, z: 33.9 }, res = [];
      for (let a = 0; a < 360; a += 15) for (const r of [6, 8, 10]) { const x = s.x + Math.sin(a * Math.PI / 180) * r, z = s.z + Math.cos(a * Math.PI / 180) * r; if (W.pathDist(x, z) < 0.6) res.push([a, r, +x.toFixed(1), +z.toFixed(1)]); }
      return res; });
    log('path points round the shop (bearing, r, x, z)', spots);
    const pick = []; for (const s of spots) if (!pick.some((p) => Math.abs(p[0] - s[0]) < 50)) pick.push(s);
    for (const [a, r, x, z] of pick.slice(0, 4)) {
      const at = await ev(([x, z]) => { const rr = P.go(x, z, { tol: 0.4 }); P.face(-102.8, 33.9); P.wait(1.2); return { r: rr.r, pos: P.state().pos }; }, [x, z]);
      log(`vis from path ${a}deg ${r}m`, { at, v: await vis(shopPts) }); await shot(`shop-from-path-${a}`);
    }
    // ---- the garden: the beds and the boat box / pond still reachable
    log('garden walk', await ev(() => { const L = game.world.life, out = []; for (const [n, p] of [['boat box', L.boatBox], ['pond edge', { x: L.pond.x + 1.9, z: L.pond.z }], ['bed 0 front', { x: L.beds[0].x - 1.3, z: L.beds[0].z }], ['bed 1 front', { x: L.beds[1].x - 1.3, z: L.beds[1].z }]]) out.push([n, P.go(p.x, p.z, { tol: 0.6, maxT: 60 }).r]); return out; }));
    await ev(() => { const L = game.world.life; P.go(L.beds[0].x - 2.5, L.beds[0].z + 1.5, { tol: 0.4 }); P.face(L.beds[0].x, L.beds[0].z); P.wait(1); }); await shot('garden-beds');
    // ---- collisions (input: walking/jumping into them)
    const col = await ev(() => { const L = game.world.life, h = game.hero, PH = game.physics, out = {}; const Pp = L.pump.pipe, U = L.pump.use;
      const at = () => [+h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2)];
      if (h.behaviour !== 'normal') P.tap('F1');
      // the pipe from the east and from the west, 4 m north of the pump (walking)
      P.go(Pp.x + 1.2, L.pump.z - 4, { tol: 0.2 }); P.face(Pp.x - 3, L.pump.z - 4); const y0 = h.pos.y; P.holdFor(['ArrowUp'], 1.5); out.pipeFromE = { at: at(), pipeX: Pp.x, rise: +(h.pos.y - y0).toFixed(2) };
      P.go(Pp.x - 1.2, L.pump.z + 4, { tol: 0.2 }); P.face(Pp.x + 3, L.pump.z + 4); P.holdFor(['ArrowUp'], 1.5); out.pipeFromW = { at: at() };
      // athletic: jump over it (Space while running at it), and jump onto the trough
      P.tap('F2'); P.go(Pp.x + 1.5, L.pump.z - 4.5, { tol: 0.2 }); P.face(Pp.x - 3, L.pump.z - 4.5); let maxY = -9; let onPipe = false;
      for (let i = 0; i < 40; i++) { if (i === 8) { P.tap('Space', 0); } else { P.holdFor(['ArrowUp'], 1 / 30); } maxY = Math.max(maxY, h.pos.y); if (Math.abs(h.pos.x - Pp.x) < 0.15 && h.onGround && h.pos.y > PH.terrain.heightAt(h.pos.x, h.pos.z) + 0.2) onPipe = true; }
      P.wait(0.5); out.jumpPipe = { at: at(), crossed: h.pos.x < Pp.x - 0.2, onPipe };
      P.go(L.trough.x + 1.4, L.trough.z, { tol: 0.2 }); P.face(L.trough.x, L.trough.z); const gy = h.pos.y; for (let i = 0; i < 25; i++) { if (i === 3) P.tap('Space', 0); else P.holdFor(['ArrowUp'], 1 / 30); } P.wait(0.6); out.troughJump = { at: at(), standingHigh: +(h.pos.y - gy).toFixed(2) };
      P.tap('F1');
      // the sign post and the customs barrier's post, walked into
      const S = L.pump.sign; P.go(S.x + 1.0, S.z, { tol: 0.2 }); P.face(S.x, S.z); P.holdFor(['ArrowUp'], 1.0); out.signPost = { at: at(), d: +Math.hypot(h.pos.x - S.x, h.pos.z - S.z).toFixed(2) };
      const bp = L.customs.barrier.position; P.go(bp.x, bp.z + 1.2, { tol: 0.2 }); P.face(bp.x, bp.z); P.holdFor(['ArrowUp'], 1.0); out.barrierPost = { at: at(), d: +Math.hypot(h.pos.x - bp.x, h.pos.z - bp.z).toFixed(2) };
      // the length of the lane: from 9 m north of the pump to 9 m south, along the pipe's east side (the lane)
      out.laneNS = P.go(U.x + 1.0, L.pump.z - 9, { tol: 0.4 }).r + '/' + P.go(U.x + 1.0, L.pump.z + 9, { tol: 0.4 }).r;
      // crossing the lane east-west where the pipe is above ground (a player heading for the houses across it)
      out.crossWestAtGap = P.go(Pp.x - 2.5, L.pump.z, { tol: 0.4 }).r;
      const t0 = game.time; const r2 = P.go(Pp.x + 2.5, L.pump.z - 5, { tol: 0.4 }); out.crossBackNorth = { r: r2.r, t: +(game.time - t0).toFixed(1) };
      return out; });
    log('collisions', col);
    // ---- the pump from the lane, both ways (normal camera)
    const pumpPts = await ev(() => { const L = game.world.life, g = L.pump.grip(), y = game.physics.terrain.heightAt(L.pump.x, L.pump.z); return { grip: [g.x, g.y, g.z], pump_top: [L.pump.x, y + 1.25, L.pump.z], trough: [L.trough.x, y + 0.4, L.trough.z], sign: [L.pump.sign.x, y + 1.15, L.pump.sign.z] }; });
    for (const [n, dz] of [['north', -7], ['south', 7], ['north-near', -3.5]]) {
      const at = await ev(([dz]) => { const L = game.world.life, U = L.pump.use; const r = P.go(U.x + 0.8, L.pump.z + dz, { tol: 0.3 }); P.face(L.pump.x, L.pump.z); P.wait(1.2); return { r: r.r, pos: P.state().pos }; }, [dz]);
      log('pump vis from the ' + n, { at, v: await vis(pumpPts) }); await shot('pump-from-' + n);
    }
    // at the grip, mid-stroke pose for a still from the default camera (the pump runs now: drink prompt; a stroke
    // can't be replayed, so this is the standing view)
    log('trees near the pump', await ev(() => { const out = []; game.scene.traverse((o) => { if (!o.isInstancedMesh || o.geometry.attributes.position.count < 600) return; const m = new o.matrixWorld.constructor(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); const e = m.elements; const d = Math.hypot(e[12] + 42, e[14] - 65); if (d < 9 && Math.hypot(e[0], e[1], e[2]) > 0.01) out.push([+e[12].toFixed(1), +e[14].toFixed(1), +Math.hypot(e[0], e[1], e[2]).toFixed(2), o.geometry.attributes.position.count]); } }); return out; }));
  }

  // ======================================================================================== evacuation board (ISO)
  if (SC === 'evac') {
    await boot('new');
    iso('evacuation chapter set by flags (c1_water, c1_plan), story.applyFlags()');
    await ev(() => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'evacuation', c1_water: true, c1_plan: true }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'evacuation'); G.hero.hasBall = true; G.story.applyFlags(); });
    log('stage', await ev(() => { game.step(0.2); return game.rooms.house.life.stage; }));
    log('desk', await ev(() => { const H = game.rooms.house.life; const u = P.use(H.zoeDesk.x, H.zoeDesk.z, { near: 0.5 }); return { r: u.r, kind: u.target?.kind, stage: H.stage }; })); log('desk lines', await said());
    await ev(() => P.wait(0.5)); await shot('board-stage2');
  }

  // ======================================================================================== the workshop
  if (SC === 'race') {
    const what = process.env.RACE || 'crank';
    await boot('continue');
    log('loaded', await ws());
    log('switch on', await useSpot('lever', 'wlever'));
    log('to ' + what, await ev((w) => { const s = game.rooms.workshop.life.spots[w]; P.go(s.x, s.z, { tol: 0.5 }); const L = game.rooms.workshop.life; if (w === 'crank') P.face(L.hoist.x, L.hoist.z); else P.face(s.x, s.z + 1); return { sync: +game.story.workshop.sync.toFixed(2), target: P.target()?.kind }; }, what));
    log('press at sync >= 0.985', await ev(() => { const W = game.story.workshop; while (W.sync < 0.985 && W.on && !game.flags.w_pair) game.step(1 / 60); const s0 = +W.sync.toFixed(3); const tg = P.target()?.kind; P.tap('KeyE', 0.02); const pairAtPress = !!game.flags.w_pair; P.wait(1.5); P.settle(); P.wait(2); return { s0, tg, pairAtPress, pair: !!game.flags.w_pair, on: W.on, up: !!game.flags.w_up, tap: !!game.flags.w_tap, lift: +game.rooms.workshop.life.lift.toFixed(2) }; }));
    log('lines', await said());
    log('state after', { st: await ws(), L: await ev(() => ({ ...game.rooms.workshop.life.state })) });
    await shot('after-' + what);
    await quitAndKeep(page, context, path.join(DIR, 'save-race-' + what + '.json')); await boot('continue');
    log('after Continue', { st: await ws(), L: await ev(() => ({ ...game.rooms.workshop.life.state })) });
  }

  if (SC === 'tapshut') {
    await boot('continue');
    log('loaded', await ws());
    log('switch on', await useSpot('lever', 'wlever'));
    await ev(() => { const W = game.story.workshop; while (W.sync < 0.45 && W.on) game.step(1 / 30); }); log('linked, cool, sync ~0.45', await ws());
    log('tap close', await useSpot('tap', 'wtap')); log('tap close lines', await said()); log('tap closed', await ws());
    const run = await ev(() => { const W = game.story.workshop, tr = []; let t = 0; while (W.on && t < 15 && !game.flags.w_pair) { P.wait(0.5); t += 0.5; tr.push([t, +W.sync.toFixed(2), +W.heat.toFixed(2)]); } return tr; });
    log('after tap shut (t, sync, heat)', run); log('state', await ws()); await ev(() => P.settle()); log('lines', await said());
    // adjacent: reopen the tap fast and run again: it should complete
    log('tap open', await useSpot('tap', 'wtap')); await said();
    log('switch on', await useSpot('lever', 'wlever'));
    const c0 = (await ws()).coins;
    await ev(() => { let t = 0; while (!game.flags.w_pair && t < 14) { P.wait(0.25); t += 0.25; } P.settle(); P.wait(1.5); });
    log('success', await ws()); log('success lines', await said());
    // leave the workshop with the coin on the floor, come back, then pick it up (input)
    log('out and back', await ev(() => { const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); const out1 = game.room?.id ?? 'citadel'; P.wait(1); const d = game.rooms.zeelich.workshopDoor; P.through(d.x, d.z); P.settle(); return { out1, back: game.room?.id }; }));
    log('back in', await ws());
    log('pick up', await ev(() => { for (let k = 0; k < 2; k++) for (const p of [...game.pickups.list]) if (p.owe === 'w_owe') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 }); P.settle(); return null; }));
    const after = await ws(); log('after pickup', { ...after, delta: after.coins - c0 });
    await quitAndKeep(page, context, path.join(DIR, 'save-tapshut-after.json')); const t1 = await boot('continue');
    const ac = await ws(); log('after Continue (no second coin)', { ...ac, delta: ac.coins - c0, toasts: t1 });
    await ev(() => { const s = game.rooms.workshop.life.spots.tap; P.go(s.x, s.z, { tol: 0.4 }); P.wait(0.5); }); await shot('after-continue');
  }

  if (SC === 'pump') {
    // LOAD = REV-TY-1/save-02.json. ISO: pliers taken and pin out by flags (isolates the stroke from the side story),
    // then the strokes by input from three approaches, each recorded frame by frame through the whole stroke
    await boot('continue');
    iso('l_pliers, l_pin, c1_water set by flags; pump freed (setFree)');
    await ev(() => { Object.assign(game.flags, { l_pliers: true, l_pin: true, l_pumpAsk: true, c1_water: true }); game.world.life.pump.setFree(true); game.story.life.homeStage(); });
    const res = [];
    for (const [n, dx, dz] of [['S', 0.4, 4], ['N', 0.3, -4], ['E (round the plinth)', 2.6, 1.6]]) {
      const r = await ev(([dx, dz]) => { const L = game.world.life, U = L.pump.use, h = game.hero, f = game.flags;
        P.go(U.x + dx, U.z + dz, { tol: 0.3 }); const g0 = P.go(U.x, U.z, { tol: 0.05, stopWhen: () => P.target()?.label === 'p_pump' });
        const bones = {}; h.rig.root.traverse((o) => { if (/^hand[LR]$|^foot[LR]$/.test(o.name)) bones[o.name] = o; });
        const wp = (o) => o.getWorldPosition(o.position.clone());
        const from = +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(2), s0 = f.l_strokes || 0, p0 = [h.pos.x, h.pos.z];
        P.tap('KeyE', 0); const rows = []; let glideT = 0;
        for (let i = 0; i < 60; i++) { game.step(1 / 60); const g = L.pump.grip(); const mid = wp(bones.handL).add(wp(bones.handR)).multiplyScalar(0.5);
          if (h.rig.anim !== 'pump') glideT += 1 / 60;
          rows.push([h.rig.anim, +(h.rig.actionT || 0).toFixed(3), +mid.distanceTo(g).toFixed(3), +wp(bones.footL).y.toFixed(2), +wp(bones.footR).y.toFixed(2), +game.physics.terrain.heightAt(h.pos.x, h.pos.z).toFixed(2)]); }
        P.settle();
        const pr = rows.filter((r) => r[0] === 'pump');
        const worst = pr.reduce((a, r) => (r[2] > a[2] ? r : a), pr[0] || [0, 0, 0]);
        return { go: g0.r, promptAt: from, slide: from, glideT: +glideT.toFixed(3), strokes: [s0, f.l_strokes], pumpFrames: pr.length, worst, over15: pr.filter((r) => r[2] > 0.15).map((r) => [r[1], r[2]]), rows: pr.map((r) => [r[1], r[2]]) }; }, [dx, dz]);
      res.push([n, r]); log('approach ' + n, { ...r, rows: undefined }); log('  hands-to-grip by actionT', r.rows);
      await said();
      if (r.strokes[1] >= 3) break;
    }
  }

  if (SC === 'door') {
    // LOAD = ch2-owed save. Doors and house fronts near Nell's new shop: still reachable by walking?
    await boot('continue');
    log('doors near the shop', await ev(() => { const s = { x: -102.8, z: 33.9 }; const ds = game.story.doors().filter((d) => Math.hypot(d.x - s.x, d.z - s.z) < 14).map((d) => ({ room: d.room, x: +d.x.toFixed(1), z: +d.z.toFixed(1), d: +Math.hypot(d.x - s.x, d.z - s.z).toFixed(1) }));
      const deco = (game.world.houses || game.world.town?.houses || []).filter?.((h) => Math.hypot((h.door?.x ?? h.x) - s.x, (h.door?.z ?? h.z) - s.z) < 14).map((h) => ({ door: h.door, x: h.x, z: h.z })) || [];
      return { ds, deco }; }));
    log('walk to them', await ev(() => { const s = { x: -102.8, z: 33.9 }, out = []; for (const d of game.story.doors().filter((d) => Math.hypot(d.x - s.x, d.z - s.z) < 14)) { const r = P.through(d.x, d.z); out.push([d.room, r.r, r.to]); if (game.room) { const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); } } return out; }));
    // the arched door seen behind the shop's roof (the house just north): walk round the shop to the house front
    log('round the shop', await ev(() => { const out = []; for (const [n, x, z] of [['west of shop', -106.6, 33.2], ['behind shop (north)', -102.8, 31.6], ['east of shop', -100.2, 33.4]]) { const r = P.go(x, z, { tol: 0.5, maxT: 40 }); out.push([n, r.r, P.state().pos]); } return out; }));
    await shot('behind-shop');
  }

  if (SC === 'jump') {
    await boot('continue');
    for (const sp of [10, 4]) log('jump the pipe (Space at frame ' + sp + ')', await ev((sp) => { const L = game.world.life, h = game.hero, Pp = L.pump.pipe; P.go(Pp.x + 2.6, L.pump.z - 4.5, { tol: 0.2 }); P.face(Pp.x - 3, L.pump.z - 4.5); P.tap('F2', 0.2); const beh = h.behaviour; const tr = [];
      for (let i = 0; i < 45; i++) { if (i === sp) P.tap('Space', 0); P.holdFor(['ArrowUp'], 1 / 30); tr.push([+h.pos.x.toFixed(2), +h.pos.y.toFixed(2)]); }
      P.tap('F1'); return { beh, crossed: h.pos.x < Pp.x - 0.2, maxY: Math.max(...tr.map((t) => t[1])), y0: tr[0][1], tr: tr.filter((t, i) => i % 3 === 0) }; }, sp));
  }

  if (SC === 'glow') {
    // LOAD = REV-TY-1/save-hot.json (a 0.24.0 save with the coupler hot in hand: it comes back cold on the bench).
    // The coupler set on the bench by input; the normal camera with Twinsen at the bench, then stepped back toward
    // the path; captures at heat ~0.05, ~0.5 (the glow warning), ~0.9.
    await boot('continue');
    log('loaded', await ev(() => ({ cs: game.flags.l_cs, ...P.state() })));
    log('nell + bench', await ev(() => { const L = game.world.life; if (!game.flags.l_nellKnows) P.talk('nell'); const r = P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); return { r: r.r, cs: game.flags.l_cs }; })); await said();
    const cpts = await ev(() => { const c = game.world.life.shop.coupler; const o = {}; for (const [n, dx, dy, dz] of [['top', 0, 0.27, 0], ['front_s', 0, 0.13, 0.16], ['side_w', -0.16, 0.13, 0], ['side_e', 0.16, 0.13, 0], ['back_n', 0, 0.13, -0.16]]) o[n] = [c.x + dx, c.y + dy, c.z + dz]; return o; });
    for (const [tag, tgt] of [['h05', 0.05], ['h50', 0.5], ['h90', 0.9]]) {
      await ev((tgt) => { let t = 0; while (game.story.life.heat < tgt && t < 12 && game.flags.l_cs === 'bench') { game.step(1 / 30); t += 1 / 30; } }, tgt);
      log('at bench ' + tag, { heat: await ev(() => +game.story.life.heat.toFixed(2)), v: await vis(cpts) }); await shotNow('at-bench-' + tag);
    }
    // again, standing back 1.6 m toward the path (south)
    log('take/barrel/back (reset)', await ev(() => { const L = game.world.life; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.wait(8); P.settle(); return game.flags.l_cs; })); await said();
    log('place again', await ev(() => { const L = game.world.life; P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const b = L.shop.bench; P.go(b.x + 0.3, b.z + 1.8, { tol: 0.2 }); P.face(b.x, b.z - 1); return game.flags.l_cs; })); await said();
    for (const [tag, tgt] of [['h05', 0.05], ['h50', 0.5], ['h90', 0.9]]) {
      await ev((tgt) => { let t = 0; while (game.story.life.heat < tgt && t < 12 && game.flags.l_cs === 'bench') { game.step(1 / 30); t += 1 / 30; } }, tgt);
      log('stepped back ' + tag, { heat: await ev(() => +game.story.life.heat.toFixed(2)), v: await vis(cpts) }); await shotNow('back-' + tag);
    }
    // the pipe: an athletic jump over it, running at it (Up + Space together)
    log('jump the pipe', await ev(() => { const L = game.world.life, h = game.hero, Pp = L.pump.pipe; P.go(Pp.x + 2.2, L.pump.z - 4.5, { tol: 0.2 }); P.face(Pp.x - 3, L.pump.z - 4.5); P.tap('F2', 0.2); const beh = h.behaviour; const tr = [];
      for (let i = 0; i < 45; i++) { if (i === 10) P.holdFor(['ArrowUp', 'Space'], 1 / 30); else P.holdFor(['ArrowUp'], 1 / 30); tr.push([+h.pos.x.toFixed(2), +h.pos.y.toFixed(2)]); }
      P.tap('F1'); return { beh, crossed: h.pos.x < Pp.x - 0.2, end: tr[tr.length - 1], maxY: Math.max(...tr.map((t) => t[1])), y0: tr[0][1], tr: tr.filter((t, i) => i % 3 === 0) }; }));
  }

  if (SC === 'contra') {
    const t0 = await boot('continue');
    log('toasts', t0);
    log('loaded', { st: await ws(), L: await ev(() => ({ ...game.rooms.workshop.life.state })), flags: await ev(() => Object.fromEntries(Object.entries(game.flags).filter(([k]) => /^w_/.test(k)))) });
    await ev(() => P.wait(2));
    for (const w of ['crank', 'tap', 'lever']) { log(w, await useSpot(w)); log(w + ' lines', await said()); }
    log('after', { st: await ws(), L: await ev(() => ({ ...game.rooms.workshop.life.state })) });
    await ev(() => { const s = game.rooms.workshop.life.spots.lever; P.go(s.x, s.z, { tol: 0.4 }); P.wait(0.8); }); await shot('loaded');
  }

  if (SC === 'oldloss') {
    const t0 = await boot('continue');
    log('toasts', t0);
    log('loaded', await st());
    log('flags', await ev(() => Object.fromEntries(Object.entries(game.flags).filter(([k]) => /^(w_|l_nell|l_bram|l_owe)/.test(k)))));
  }

  if (SC === 'pre') {
    await boot('continue');
    log('start', await ev(() => ({ ...P.state(), c2_plan: !!game.flags.c2_plan, ws: Object.keys(game.flags).filter((k) => /^w_/.test(k)) })));
    log('enter', await ev(() => { const r = P.enter('workshop', { run: true }); P.settle(); P.wait(1); return { r: r.r, room: game.room?.id, ready: game.story.workshop.ready }; })); log('enter lines', await said());
    for (const w of ['lever', 'tap', 'crank']) {
      log(w + ' prompt', await ev((w) => { const s = game.rooms.workshop.life.spots[w]; P.go(s.x, s.z, { tol: 0.4 }); const L = game.rooms.workshop.life; P.face(w === 'crank' ? L.hoist.x : s.x, w === 'crank' ? L.hoist.z : s.z + 1); const tg = P.target(); P.tap('KeyE', 0.1); P.settle(); return { tg: tg && tg.kind + ':' + tg.label, on: game.story.workshop.on, up: !!game.flags.w_up, tap: !!game.flags.w_tap }; }, w));
      log(w + ' lines', await said());
    }
    log('talk 1', await ev(() => { const r = P.talk('baldino'); return { r: r.r, plan: !!game.flags.c2_plan, ready: game.story.workshop.ready }; })); log('talk 1 lines', await said());
    log('lever after hello', await useSpot('lever')); log('lines', await said()); log('state', await ws());
    await ev(() => P.settle());
  }

  if (SC === 'crate') {
    await boot('continue');
    if (await ev(() => game.room?.id !== 'workshop')) log('enter (input)', await ev(() => { const r = P.enter('workshop', { run: true }); P.settle(); P.wait(1); return r.r; }));
    log('flags', await ev(() => ({ seen: !!game.flags.w_crateSeen, searched: game.searched.includes('giver:workshop:crate') })));
    const C = await ev(() => game.rooms.workshop.center?.x ?? 1500);
    const r = await ev(() => { const h = game.hero, key = 'giver:workshop:crate', out = []; const cg = game.rooms.workshop.givers.find((g) => g.id === 'crate'); if (h.behaviour !== 'normal') P.tap('F1');
      // REV-TY-2 D6's repro: the north side of the crate (the side he arrives on from the door), facing it
      P.go(1500 + 3.45, 1.35, { tol: 0.25 }); P.face(cg.x, cg.z);
      for (let i = 0; i < 3; i++) { const tg = P.target(); P.tap('KeyE', 0.1); P.settle(); P.wait(1.2); P.settle(); out.push({ press: i + 1, tg: tg ? tg.kind + ':' + tg.label : null, searched: game.searched.includes(key), seen: !!game.flags.w_crateSeen, pickups: game.pickups.list.filter((p) => Math.hypot(p.pos.x - cg.x, p.pos.z - cg.z) < 3).map((p) => p.type) }); P.go(1500 + 3.45, 1.35, { tol: 0.25 }); P.face(cg.x, cg.z); }
      return out; });
    log('north side presses', r); log('lines', await said());
  }

  if (SC === 'cradle') {
    await boot('continue');
    log('loaded', await ws());
    log('crank down', await useSpot('crank', 'wcrank')); await ev(() => { P.wait(2.5); P.settle(); }); log('down', await ws()); await said();
    log('into the lowered cradle (from W, N, S)', await ev(() => { const L = game.rooms.workshop.life, h = game.hero, out = {}; for (const [n, dx, dz] of [['W', -1.3, 0], ['N', 0, -1.2], ['S', 0, 1.2]]) { P.go(L.hoist.x + dx, L.hoist.z + dz, { tol: 0.2 }); P.face(L.hoist.x, L.hoist.z); P.holdFor(['ArrowUp'], 1.2); out[n] = { d: +Math.hypot(h.pos.x - L.hoist.x, h.pos.z - L.hoist.z).toFixed(2), y: +h.pos.y.toFixed(2) }; } return out; }));
    log('crank up', await useSpot('crank', 'wcrank')); await ev(() => { P.wait(2.5); P.settle(); }); await said();
    // raised: can he walk under it? then lower it and run under while it comes down
    log('under the raised cradle', await ev(() => { const L = game.rooms.workshop.life, h = game.hero; const r = P.go(L.hoist.x, L.hoist.z, { tol: 0.2, maxT: 6 }); return { r: r.r, d: +Math.hypot(h.pos.x - L.hoist.x, h.pos.z - L.hoist.z).toFixed(2), lift: L.lift }; }));
    log('crank down then straight under', await ev(() => { const L = game.rooms.workshop.life, h = game.hero, s = L.spots.crank; P.go(s.x, s.z, { tol: 0.4 }); P.face(L.hoist.x, L.hoist.z); P.tap('KeyE', 0.05); for (let i = 0; i < 90 && h.actT > 0; i++) game.step(1 / 60);
      const tr = []; const r = P.go(L.hoist.x, L.hoist.z, { tol: 0.15, maxT: 3 }); for (let i = 0; i < 6; i++) { P.wait(0.5); tr.push([+L.lift.toFixed(2), +Math.hypot(h.pos.x - L.hoist.x, h.pos.z - L.hoist.z).toFixed(2), +h.pos.y.toFixed(2)]); }
      const esc = P.go(L.spots.crank.x, L.spots.crank.z, { tol: 0.4, maxT: 6 }); return { go: r.r, trace: tr, escape: esc.r }; }));
    await shot('cradle');
  }

  if (SC === 'ch10') {
    const pair = !!process.env.PAIR;
    await boot('new');
    iso('chapter 9 done by flags (as tests/chapter10.mjs); story.nextChapter() starts chapter 10' + (pair ? '; the pair done by flags' : ''));
    await ev((pair) => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 8, chapterKey: 'council', c1_done: true, c1_plan: true, c2_plan: true, c2_key: true, c2_shield: true, c2_broadcast: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true, c9_started: true, c9_vote: true, ...(pair ? { w_ask: true, w_pair: true, w_paid: true, w_up: true, w_tap: true } : {}) }); game.hero.swapBody?.('twinsen'); game.hero.hasBall = true; game.story.applyFlags(); }, pair);
    await said();
    await ev(() => { game.story.nextChapter(); P.settle(); });
    log('ch10 opening lines', await said());
  }
} catch (e) { console.log('ERROR', e.message.split('\n').slice(0, 3).join(' ')); }
fs.writeFileSync(path.join(DIR, `rev-${SC}${process.env.TAG ? '-' + process.env.TAG : ''}.json`), JSON.stringify(out, null, 1));
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
