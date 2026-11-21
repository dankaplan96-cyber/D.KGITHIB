// REV-TY-4 review runner (independent of tests/desert-life.mjs). node rev.mjs <scenario>
// GAME_URL selects the server; LOAD=<storage.json> continues from a real (isolated) save; KEEP=<file> keeps a save at
// the end (Esc -> Save & quit). Input harness: tests/lib/player.js (window.P: keys + game.step, A* over the game's own
// collision). Screenshots -> shots/<scenario>-*.png from the normal (lba) game camera following Twinsen. Anything that
// is not player input is printed with an "ISO" prefix.
// Scenarios:
//   k4dry   LOAD=save-06 (chapter 4 start, reached by input): Kesh before the pump, the stair, the roof, the crank,
//           overshoot, roof/stair edges and jumps, trap scan, readability -> KEEP (sand, cowl north)
//   chk     LOAD=any: Continue and print Kesh state (save/Continue checks)
//   k4screen LOAD=after the pump: Lumi's screen (carried) -> KEEP
//   k4fit   LOAD=screen carried: fit, turn, draws, door, drink, Brosk pays, coin left lying, leave & return -> KEEP
//   yacht   LOAD=after Ilka (yacht at camp): back to the village and the ride to the dig over the drift (sampled)
//   k5      LOAD=chapter 5 start without the Kesh story: Brosk errand order, the board, The Wind-Catcher in ch5
//   board   LOAD=any: walk to the yacht stop from the village and look at it
//   perf    ISO (positioned): render counts at fixed spots (run on both builds)
import { launch, open, menu, quitAndKeep } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const SC = process.argv[2];
const SHOTS = path.join(DIR, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const out = {};
const log = (k, v) => { out[k] = v; console.log(k + ': ' + JSON.stringify(v)?.slice(0, 2400)); };
const iso = (s) => { console.log('ISO  ' + s); };
const { browser, context, page, errs } = await launch({ storageState: process.env.LOAD, width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const hook = () => ev(() => { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines.map((l) => (n ? n + ': ' : '') + (Array.isArray(l) ? l.join(':') : l))); return sv.call(this, n, lines, ...a); };
  const tv = game.hud.toast.bind(game.hud); game.hud.toast = (k, ...a) => { window._said.push('TOAST ' + k + (a[0] ? ' ' + JSON.stringify(a[0]) : '')); return tv(k, ...a); }; });
const boot = async (act) => { await open(page, '?nocine'); await menu(page, act); const t = await ev(() => [...game.hud.toastEl.children].map((c) => c.textContent)); await ev(() => P.settle()); await hook(); return t; };
const said = () => ev(() => { const s = window._said.slice(); window._said.length = 0; return s; });
const shot = async (name) => { await ev(() => { game.step(1 / 30); game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, `${SC}-${name}.png`) }); };
const KS = () => ev(() => { const f = game.flags, K = game.rooms.desert?.kesh, h = game.hero; return { room: game.room?.id, ch: f.chapterKey, k: Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('k_'))), cowl: K?.cool.dir, jars: game.story.kesh._jars, ferry: game.story.kesh._ferry, items: game.story.items().map((i) => i.id), journal: game.story.journal().find((j) => j.title === 'Kesh')?.lines, coins: h.coins, hp: h.hp + '/' + h.maxHp, pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), lying: game.pickups.list.filter((p) => p.owe).map((p) => p.owe + ':' + p.type), state: game.state }; });
const L = (x, z) => [3400 + x, z];
// is each world point on screen and the first thing a ray from the game camera meets?
const vis = (pts) => ev(async (pts) => {
  const THREE = await import('three');
  game.renderer.render?.();
  const cam = game.camera, cp = new THREE.Vector3(); cam.getWorldPosition(cp);
  const rc = new THREE.Raycaster();
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const meshes = []; game.scene.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) && shown(o)) meshes.push(o); });
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
    const blocked = first && first.distance < d - 0.25;
    res[n] = on ? (blocked ? 'HIDDEN (' + (first.object.geometry?.type || 'mesh') + ' at ' + first.distance.toFixed(1) + ' of ' + d.toFixed(1) + ' m)' : 'VISIBLE ' + d.toFixed(1) + ' m, ndc ' + ndc.x.toFixed(2) + ',' + ndc.y.toFixed(2)) : 'OFF-SCREEN (ndc ' + ndc.x.toFixed(2) + ',' + ndc.y.toFixed(2) + ')';
  }
  return res;
}, pts);
// the cool room's points that matter for reading the puzzle (world)
const coolPts = () => ev(() => { const C = game.rooms.desert.kesh.cool, d = C.dir, a = d * Math.PI / 2, tx = 3400 - 71.4, tz = -6;
  const mx = tx + (-Math.cos(a)) * 0.95, mz = tz + Math.sin(a) * 0.95;   // mouth (local -x rotated by dir about y)
  const P0 = game.rooms.desert.pump, py = game.physics.groundAt(P0.x, P0.z, 30) + 9.65, pole = game.rooms.desert.kesh.poles;
  const hp = game.hero.pos; const near = [...pole].sort((p, q) => Math.hypot(p.x - hp.x, p.z - hp.z) - Math.hypot(q.x - hp.x, q.z - hp.z))[0];
  return { crank: [C.crank.x, C.roofY + 0.95, C.crank.z], cowlMouth: [mx, C.roofY + 1.9 + 0.5, mz], cowlTop: [tx, C.roofY + 1.9 + 1.06, tz], door: [C.door.x, C.roofY - 2.0, C.door.z - 0.9], pumpWheel: [P0.x - 0.6, py, P0.z], nearestPole: [near.x, game.physics.groundAt(near.x, near.z, 30) + 2.5, near.z] }; });

try {
  // ==================================================================================== chapter 4 before the pump
  if (SC === 'k4dry') {
    await boot('continue');
    log('start', await KS());
    // walk along the main track from the pier toward the village; stop opposite the cool room
    log('walk to the track by the cool room', await ev(() => P.go(3400 - 70, 3.5, { tol: 0.8 })));
    await ev(() => { P.face(3400 - 70, -6); P.wait(1.0); });
    await shot('01-track-view');
    log('vis from the track', await vis(await coolPts()));
    // the people (input)
    log('sani', await ev(() => P.talk('dkid'))); log('sani lines', await said());
    log('brosk', await ev(() => P.talk('dtrader'))); log('brosk lines', await said());
    log('brosk again', await ev(() => P.talk('dtrader'))); log('brosk again lines', await said());
    log('lumi', await ev(() => P.talk('weaver'))); log('lumi lines', await said());
    await shot('02-lumi-loom');
    log('door', await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); return { r: r.r, label: r.target?.label }; })); log('door lines', await said());
    await shot('03-door');
    log('state', await KS());
    // up the stair by walking to the crank (the planner's own route), timed
    const up = await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero; const t0 = game.time; P.trace.length = 0;
      // first only to the roof (no E yet): where does the prompt appear?
      const r = P.go(C.crank.x + 0.9, C.crank.z, { tol: 0.5 });
      return { r: r.r, t: +(game.time - t0).toFixed(1), y: +h.pos.y.toFixed(2), roofY: +C.roofY.toFixed(2), prompt: P.target(), trace: P.trace.slice(-6) }; });
    log('to the roof by walking', up);
    await ev(() => { const C = game.rooms.desert.kesh.cool; P.face(C.crank.x, C.crank.z); P.wait(0.5); });
    await shot('04-roof-at-crank');
    log('vis on the roof at the crank', await vis(await coolPts()));
    // turn 1 (east -> south: side-on)
    for (let i = 1; i <= 2; i++) {
      log('turn ' + i, await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(2.0); return { r: r.r, label: r.target?.label, dir: f.k_dir, cowl: C.dir, turning: C.turning(), sand: !!f.k_sand }; }));
      log('turn ' + i + ' lines', await said());
      await shot('05-turn' + i);
    }
    log('vis after the sand', await vis(await coolPts()));
    // E spam on the crank while it turns (input: E pressed repeatedly)
    const spam = await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags, d0 = f.k_dir; const n0 = f.k_turns; for (let k = 0; k < 8; k++) { P.tap('KeyE', 0.05); if (game.state === 'dialog') P.settle(); } P.wait(2); P.settle(); return { d0, d1: f.k_dir, turns: f.k_turns - n0, cowl: C.dir, sand: !!f.k_sand }; });
    log('E spam on the crank (8 taps)', spam); log('spam lines', await said());
    // bring it to north (overshoot past west) if it is not there
    log('turn to north', await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; for (let i = 0; i < 4 && f.k_dir !== 1; i++) { P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(1.5); } return { dir: f.k_dir, cowl: C.dir, sand: !!f.k_sand, turns: f.k_turns }; }));
    log('overshoot lines', await said());
    // roof edges: walk at each edge (input), then jump at it (Athletic, Space)
    const edges = await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero, res = {}, cx = 3400 - 70, cz = -6;
      const go0 = () => P.go(cx + 1.4, cz + 0.2, { tol: 0.4 });
      for (const [n, tx, tz] of [['north', cx + 1.4, cz + 20], ['south', cx + 1.4, cz - 20], ['west(n of tower)', cx - 20, cz + 1.4], ['east (parapet)', cx + 20, cz + 1.0]]) {
        go0(); P.face(tx, tz); const hp0 = h.hp; P.holdFor(['ArrowUp'], 2.0); const walk = { y: +h.pos.y.toFixed(2), x: +(h.pos.x - cx).toFixed(2), z: +(h.pos.z - cz).toFixed(2), hp: h.hp - hp0 };
        go0(); P.face(tx, tz); if (h.behaviour !== 'athletic') P.tap('F2'); P.holdFor(['ArrowUp'], 0.6); P.tap('Space', 0); P.holdFor(['ArrowUp'], 1.5); P.wait(1.5); if (h.behaviour === 'athletic') P.tap('F1');
        res[n] = { walk, jump: { y: +h.pos.y.toFixed(2), x: +(h.pos.x - cx).toFixed(2), z: +(h.pos.z - cz).toFixed(2), hp: h.hp - hp0, onRoof: h.pos.y > C.roofY - 0.3 } };
        if (h.pos.y < C.roofY - 0.3) { const back = P.go(C.crank.x + 0.9, C.crank.z, { tol: 0.5 }); res[n].back = { r: back.r, y: +h.pos.y.toFixed(2) }; }
      }
      res.roofY = +C.roofY.toFixed(2); return res; });
    log('roof edges (walk, then jump)', edges);
    // the stair: walking off its open east side halfway up, and off the north end of its top; hp; back up
    const stair = await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero, res = {}, sx = 3400 - 66.45;
      P.go(C.stairMid.x, C.stairMid.z, { tol: 0.3 }); const y0 = h.pos.y; P.face(sx + 10, C.stairMid.z); const hp0 = h.hp; P.holdFor(['ArrowUp'], 1.2); P.wait(1);
      res.offEastMid = { from: +y0.toFixed(2), y: +h.pos.y.toFixed(2), hp: h.hp - hp0, dead: h.dead };
      const r1 = P.go(C.crank.x + 0.9, C.crank.z, { tol: 0.5 }); res.backUp = { r: r1.r, y: +h.pos.y.toFixed(2) };
      // top tread (stair top z ~ -7.5), walk north off it
      P.go(sx, -7.5, { tol: 0.25 }); const y1 = h.pos.y, hp1 = h.hp; P.face(sx, -20); P.holdFor(['ArrowUp'], 1.0); P.wait(1);
      res.offTopNorth = { from: +y1.toFixed(2), y: +h.pos.y.toFixed(2), hp: h.hp - hp1, dead: h.dead };
      return res; });
    log('stair falls', stair);
    // traps: from spots round the blockhouse (where a fall or a walk could leave him), can he walk back to the porch?
    const traps = await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero, PH = game.physics, res = [];
      const cx = 3400 - 70, cz = -6, x0 = cx - 3, x1 = cx + 3, z0 = cz - 2.3, z1 = cz + 2.3;
      const spots = [];
      for (let k = -4; k <= 4; k++) { spots.push([cx + k * 0.8, z0 - 0.7], [cx + k * 0.8, z0 - 1.6], [cx + k * 0.8, z1 + 0.7]); }
      for (let k = -2; k <= 2; k++) { spots.push([x0 - 0.7, cz + k * 1.0], [x0 - 1.8, cz + k * 1.0], [x0 - 3.2, cz + k * 1.2], [x1 + 1.3, cz + k * 1.0], [x1 + 2.2, cz + k * 1.0]); }
      const save = { x: h.pos.x, y: h.pos.y, z: h.pos.z };
      for (const [x, z] of spots) {
        if (PH.blockedAt(x, z, PH.groundAt(x, z, 30), 0.3)) { res.push({ at: [+(x - 3400).toFixed(1), +z.toFixed(1)], blocked: true }); continue; }
        h.pos.set(x, PH.groundAt(x, z, 30), z); h.vy = 0; h.onGround = true;
        const p = P.plan(C.door.x, C.door.z, { tol: 0.6, maxNodes: 30000 });
        res.push({ at: [+(x - 3400).toFixed(1), +z.toFixed(1)], y: +h.pos.y.toFixed(2), ok: p.ok, left: p.left });
      }
      h.pos.set(save.x, save.y, save.z);
      return { bad: res.filter((r) => !r.blocked && !r.ok), n: res.length, blocked: res.filter((r) => r.blocked).length }; });
    iso('trap scan: the planner started from sampled spots round the blockhouse (planning only; the hero is put back)');
    log('trap scan (walkable back to the door?)', traps);
    // down to the door: the sand and the puffs
    log('to the door', await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.go(C.door.x + 0.3, C.door.z + 1.6, { tol: 0.5 }); P.face(C.door.x, C.door.z - 1); P.wait(1.7); return r.r; }));
    await shot('06-door-sand');
    log('door with sand', await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); return r.target?.label; })); log('door sand lines', await said());
    log('brosk with sand', await ev(() => P.talk('dtrader').r)); log('brosk sand lines', await said());
    log('lumi with sand (dry)', await ev(() => P.talk('weaver').r)); log('lumi sand lines', await said());
    log('end', await KS());
  }

  if (SC === 'chk') {
    const t = await boot('continue');
    log('continue toasts', t);
    log('state', await KS());
    log('lines on continue', await said());
    if (process.env.ROOFSHOT) { await ev(() => { const C = game.rooms.desert.kesh.cool; P.go(C.crank.x + 0.9, C.crank.z, { tol: 0.5 }); P.face(C.crank.x, C.crank.z); P.wait(0.6); }); await shot('roof'); }
  }

  // ==================================================================================== after the pump: the screen
  if (SC === 'k4screen') {
    await boot('continue');
    log('start', await KS());
    log('sani (wet)', await ev(() => P.talk('dkid').r)); log('sani lines', await said());
    log('brosk (wet, sand)', await ev(() => P.talk('dtrader').r)); log('brosk lines', await said());
    log('lumi', await ev(() => P.talk('weaver').r)); log('lumi lines', await said());
    log('lumi again', await ev(() => P.talk('weaver').r)); log('lumi again lines', await said());
    log('inventory', await ev(() => { const it = game.story.items(); return it; }));
    log('end', await KS());
  }

  // ==================================================================================== fit, turn, draws, reward
  if (SC === 'k4fit') {
    await boot('continue');
    log('start', await KS());
    log('fit (on the roof)', await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(1); return { r: r.r, label: r.target?.label, fit: !!f.k_fit, done: !!f.k_done, dir: f.k_dir }; }));
    log('fit lines', await said());
    for (let i = 0; i < 4; i++) {
      const r = await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; if (f.k_done) return null; const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(2); return { label: r.target?.label, dir: f.k_dir, done: !!f.k_done, sand: !!f.k_sand }; });
      if (!r) break; log('turn', r); log('turn lines', await said());
    }
    await ev(() => P.wait(1.0));
    await shot('01-roof-draws');
    log('vis on the roof (draws)', await vis(await coolPts()));
    log('crank after done', await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); return r.target?.label; })); log('crank done lines', await said());
    log('down to the porch', await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.go(C.door.x + 0.4, C.door.z + 2.2, { tol: 0.5 }); P.face(C.door.x, C.door.z - 1); P.wait(1); return r.r; }));
    await shot('02-porch-draws');
    log('sani spot / door prompt', await ev(() => { const C = game.rooms.desert.kesh.cool, s = P.npc('dkid'); return { sani: [s.pos.x - C.sani.x, s.pos.z - C.sani.z].map((v) => +v.toFixed(2)), anim: s.forceAnim, prompt: P.target() }; }));
    log('drink at full hp', await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero; const hp = h.hp; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); return { label: r.target?.label, hp0: hp, hp: h.hp, max: h.maxHp }; })); log('drink lines', await said());
    log('brosk pays', await ev(() => { const h = game.hero, f = game.flags; const c0 = h.coins; const r = P.talk('dtrader'); P.wait(1.5); return { r: r.r, paid: !!f.k_paid, owe: f.k_owe || 0, coins: h.coins - c0, lying: game.pickups.list.filter((p) => p.owe === 'k_owe').map((p) => [+(p.pos.x - 3400).toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]) }; }));
    log('pay lines', await said());
    log('brosk again (E spam x3)', await ev(() => { const h = game.hero, f = game.flags; const c0 = h.coins; for (let k = 0; k < 3; k++) P.talk('dtrader'); return { owe: f.k_owe || 0, coins: h.coins - c0, lying: game.pickups.list.filter((p) => p.owe === 'k_owe').length }; }));
    log('again lines', await said());
    // leave the coin lying: into the School of Magic and back out
    const school = await ev(() => { const doors = game.story.doors().filter((d) => d.region === 'desert'); return doors.map((d) => ({ room: d.room, x: +(d.x - 3400).toFixed(1), z: +d.z.toFixed(1) })); });
    log('doors on the island', school);
    log('into a room and back', await ev(() => { const f = game.flags, h = game.hero; const c0 = h.coins; const d = game.story.doors().find((x) => x.region === 'desert' && /school|magic/i.test(x.room)) || game.story.doors().find((x) => x.region === 'desert');
      const r1 = P.through(d.x, d.z, { run: true }); const inRoom = game.room?.id; const lyingIn = game.pickups.list.filter((p) => p.owe === 'k_owe').length;
      const e = game.room.exits.find((x) => !x.room) || game.room.exits[0]; const r2 = P.through(e.x, e.z); P.settle();
      return { r1: r1.r, inRoom, lyingIn, back: game.room?.id, owe: f.k_owe || 0, coins: h.coins - c0, lying: game.pickups.list.filter((p) => p.owe === 'k_owe').length }; }));
    log('room trip lines', await said());
    log('pick the coin up (walk)', await ev(() => { const h = game.hero, f = game.flags; const c0 = h.coins; for (const p of [...game.pickups.list]) if (p.owe === 'k_owe') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 60 }); P.settle(); return { owe: f.k_owe || 0, coins: h.coins - c0 }; }));
    log('after lines (each twice)', await ev(() => { for (const id of ['dtrader', 'weaver', 'dkid', 'dtrader', 'weaver', 'dkid']) P.talk(id); return 1; })); log('after lines', await said());
    log('journal', await ev(() => game.story.journal().find((j) => j.title === 'Kesh')));
    log('end', await KS());
  }

  // ==================================================================================== the yacht over the drift
  if (SC === 'yacht') {
    await boot('continue');
    log('start', await KS());
    const ride = async (label) => {
      log(label, await ev(() => { const D = game.rooms.desert, Y = D.yacht, h = game.hero, PH = game.physics, f = game.flags;
        const r = P.talk('hesk', { run: true }); const samples = []; let maxDy = 0, minClear = 99, t = 0;
        const poles = D.kesh.poles;
        while (Y.riding && t < 60) { game.step(1 / 30); t += 1 / 30;
          const gy = PH.groundAt(h.pos.x, h.pos.z, h.pos.y + 2);
          maxDy = Math.max(maxDy, Math.abs(h.pos.y - 0.75 - gy));
          for (const p of poles) minClear = Math.min(minClear, Math.hypot(p.x - h.pos.x, p.z - h.pos.z));
          if (Math.hypot(h.pos.x - D.kesh.drift.x, h.pos.z - D.kesh.drift.z) < 4 && samples.length < 12) samples.push([+(h.pos.x - 3400).toFixed(1), +h.pos.z.toFixed(1), +h.pos.y.toFixed(2), +gy.toFixed(2)]);
        }
        P.settle();
        return { r: r.r, at: f.c4_yacht, t: +t.toFixed(1), heroMinusGround: +maxDy.toFixed(2), minDistHeroToPole: +minClear.toFixed(2), overDrift: samples, state: game.state }; }));
      log(label + ' lines', await said());
    };
    await ride('ride 1');
    await shot('01-after-ride1');
    await ride('ride 2');
    // the drift seen from the normal camera: walk back to it from the dig end
    log('walk to the drift', await ev(() => { const D = game.rooms.desert; const r = P.go(D.kesh.drift.x + 5, D.kesh.drift.z + 1, { tol: 0.8, maxT: 120 }); P.face(D.kesh.drift.x, D.kesh.drift.z); P.wait(1); return r.r; }));
    await shot('02-drift');
    log('walk over the drift and back', await ev(() => { const D = game.rooms.desert, h = game.hero; const r = P.go(D.kesh.drift.x - 5, D.kesh.drift.z - 1, { tol: 0.8, maxT: 60 }); const r2 = P.go(D.kesh.drift.x + 6, D.kesh.drift.z + 2, { tol: 0.8, maxT: 60 }); return [r.r, r2.r]; }));
    log('end', await KS());
  }

  if (SC === 'yacht2') {
    await boot('continue');
    log('start', await KS());
    await ev(() => { const D = game.rooms.desert, Y = D.yacht, PH = game.physics, h = game.hero; window._ys = { n: 0, maxDy: 0, minPole: 99, minPoleYacht: 99, drift: [] }; const st = game.step.bind(game);
      game.step = function (dt) { const r = st(dt); if (Y.riding) { const S = window._ys; S.n++; const gy = PH.groundAt(h.pos.x, h.pos.z, h.pos.y + 3); S.maxDy = Math.max(S.maxDy, Math.abs(h.pos.y - 0.75 - gy));
        for (const p of D.kesh.poles) S.minPole = Math.min(S.minPole, Math.hypot(p.x - h.pos.x, p.z - h.pos.z));
        if (Math.hypot(h.pos.x - D.kesh.drift.x, h.pos.z - D.kesh.drift.z) < 3.5 && S.drift.length < 40) S.drift.push([+(h.pos.x - 3400).toFixed(1), +h.pos.z.toFixed(1), +(h.pos.y - 0.75).toFixed(2)]); } return r; }; });
    iso('a sampler wraps game.step to record the ride (read-only)');
    for (const k of [1, 2]) {
      log('ride ' + k, await ev(() => { window._ys = { n: 0, maxDy: 0, minPole: 99, drift: [] }; const r = P.talk('hesk', { run: true }); return { r: r.r, at: game.flags.c4_yacht, ...window._ys, drift: window._ys.drift.filter((_, i) => i % 4 === 0) }; }));
      log('ride ' + k + ' lines', await said());
      if (k === 2) await shot('01-at-dig-end');
    }
    log('drift ground profile across the track (local x 4..15, z on the toDig line)', await ev(() => { const PH = game.physics, out = []; for (let x = 3; x <= 16; x += 1) { const z = 10 + (x + 4) * 6 / 20; out.push([x, +PH.groundAt(3400 + x, z, 30).toFixed(2)]); } return out; }));
    log('end', await KS());
  }

  if (SC === 'yachtclip') {
    await boot('continue');
    log('start', await KS());
    // talk to Hesk by input (walk, E, E through his line); the ride then runs; stop stepping when the yacht is at the pole
    const r = await ev(() => { const D = game.rooms.desert, Y = D.yacht, h = game.hero, n = P.npc('hesk');
      P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1);
      for (let k = 0; k < 40 && game.state === 'dialog'; k++) P.tap('KeyE', 0.15);
      const px = 3400 - 18.1, pz = 8.1; let best = 99, t = 0;
      while (Y.riding && t < 40) { game.step(1 / 30); t += 1 / 30; const d = Math.hypot(h.pos.x - px, h.pos.z - pz); if (d < best) best = d; if (d < 1.05) break; }
      return { riding: !!Y.riding, d: +best.toFixed(2), state: game.state }; });
    log('ride stopped at the pole', r);
    await ev(() => { game.renderer.render(); });
    await page.screenshot({ path: path.join(SHOTS, `${SC}-pole.png`) });
    log('vis', await ev(() => { const px = 3400 - 18.1, pz = 8.1; return [px, game.physics.groundAt(px, pz, 30) + 0.5, pz]; }).then((p) => vis({ poleFoot: p })));
    await ev(() => P.settle());
    log('end', await KS());
  }

  // the door's clue with the sand in and the mouth INTO the wind (input from the chapter-4 start save)
  if (SC === 'doorhint') {
    await boot('continue');
    if (process.env.SKIP) { await ev(() => P.go(game.rooms.desert.kesh.cool.crank.x + 0.9, game.rooms.desert.kesh.cool.crank.z, { tol: 0.5 })); }
    if (!process.env.SKIP) {
    log('start', await KS());
    log('two turns (input)', await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; for (let i = 0; i < 2; i++) { P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(1.5); } return { dir: f.k_dir, sand: !!f.k_sand }; }));
    log('turn lines', await said());
    log('door (mouth into the wind, sand in)', await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); return { label: r.target?.label, dir: game.flags.k_dir }; }));
    log('door lines', await said());
    log('brosk', await ev(() => P.talk('dtrader').r)); log('brosk lines', await said());
    // race: E on the crank, then at once Esc -> Save & quit (the turn's action has not landed yet)
    log('race: E then Esc at once', await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags, h = game.hero; P.go(C.crank.x + 0.9, C.crank.z, { tol: 0.5 }); P.face(C.crank.x, C.crank.z); const d0 = f.k_dir; P.tap('KeyE', 0.0); return { d0, actT: +h.actT.toFixed(2), dirNow: f.k_dir, cowl: C.dir }; }));
    await ev(() => { P.release(); P.tap('Escape', 0.1); });
    log('paused state', await ev(() => ({ state: game.state, dir: game.flags.k_dir, cowl: game.rooms.desert.kesh.cool.dir })));
    await page.click('#pause [data-act="quit"]', { timeout: 60000 });
    await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
    await context.storageState({ path: path.join(DIR, 'save-race.json') });
    log('kept save-race.json (quit during the crank action)', 1);
    await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => P.settle()); await hook();
    log('after continue', await KS());
    log('after continue +3s', await ev(() => { P.wait(3); P.settle(); const f = game.flags, C = game.rooms.desert.kesh.cool; return { dir: f.k_dir, cowl: C.dir, turns: f.k_turns, sand: !!f.k_sand, state: game.state }; }));
    log('lines', await said());
    }
    // death and Retry: ISO hp set to 1, then a jump off the roof (input)
    if (process.env.NOCLOVER) { iso('clovers set to 0'); await ev(() => { game.hero.clovers = 0; }); }
    iso('hero hp set to 1 (to provoke a fall death on purpose)');
    log('death by jumping off the roof', await ev(() => { const C = game.rooms.desert.kesh.cool, h = game.hero; P.go(C.crank.x + 1.4, C.crank.z + 0.2, { tol: 0.4 }); P.face(h.pos.x, h.pos.z + 20); h.hp = 1; if (h.behaviour !== 'athletic') P.tap('F2'); P.holdFor(['ArrowUp'], 0.6); P.tap('Space', 0); P.holdFor(['ArrowUp'], 1.5); P.wait(3); for (let i = 0; i < 120 && h.dead && game.state !== 'gameover'; i++) game.step(1 / 30); return { dead: h.dead, hp: h.hp, state: game.state }; }));
    const go = await ev(() => game.state);
    if (go === 'gameover') {
      await page.click('#gameover [data-act="retry"]', { timeout: 60000 });
      await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
      await page.addScriptTag({ path: path.join(DIR, '../../../../tests/lib/player.js') }); await ev(() => { game.testFreeze = true; P.settle(); }); await hook();
      log('after retry', await KS());
    }
  }
  if (SC === 'oldpos') {
    iso('the save\'s hero x/z edited to ' + process.env.TAG + ' (a spot that was open dune in 0.25.1; emulates an older save made there)');
    await boot('continue');
    log('loaded at', await ev(() => { const h = game.hero, PH = game.physics; return { pos: [h.pos.x - 3400, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), blocked: PH.blockedAt(h.pos.x, h.pos.z, h.pos.y, 0.05) }; }));
    log('walk to the plaza', await ev(() => { const r = P.go(3400 - 50, 2, { tol: 1.0, maxT: 60 }); const h = game.hero; return { r: r.r, at: [h.pos.x - 3400, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) }; }));
  }
  if (SC === 'prompt') {
    await boot('continue');
    log('start', await KS());
    log('at the door after it draws: what E does', await ev(() => { const C = game.rooms.desert.kesh.cool, res = {}; for (const [n, dx, dz] of [['front', 0, 0.6], ['front-left', -0.7, 0.6], ['front-right', 0.7, 0.7], ['2m out', 0, 1.6]]) { P.go(C.door.x + dx, C.door.z + dz, { tol: 0.25 }); P.face(C.door.x, C.door.z - 1); const t = P.target(); res[n] = t && (t.kind + ':' + (t.id || '') + ':' + t.label); } return res; }));
  }

  // ==================================================================================== chapter 5 first
  if (SC === 'k5') {
    await boot('continue');
    log('start', await KS());
    log('sani (ch5, nothing done)', await ev(() => P.talk('dkid').r)); log('sani lines', await said());
    log('lumi (ch5)', await ev(() => P.talk('weaver').r)); log('lumi lines', await said());
    log('items', await ev(() => game.story.items().map((i) => i.id)));
    log('brosk (ch5, before jar)', await ev(() => { const r = P.talk('dtrader'); return { r: r.r, jar: !!game.flags.c5_jar, ask: !!game.flags.k_ask }; })); log('brosk lines', await said());
    log('door', await ev(() => { const C = game.rooms.desert.kesh.cool; const r = P.use(C.door.x, C.door.z, { kind: 'kdoor', near: 0.9 }); return r.target?.label; })); log('door lines', await said());
    log('brosk again (jar in hand, no water)', await ev(() => { const r = P.talk('dtrader'); return { r: r.r, ask: !!game.flags.k_ask }; })); log('brosk 2 lines', await said());
    // screen first, fitted facing east; then three turns past... (east->south->west)
    log('fit (screen first)', await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(1); return { label: r.target?.label, fit: !!f.k_fit, dir: f.k_dir }; })); log('fit lines', await said());
    for (let i = 0; i < 3; i++) { const r = await ev(() => { const C = game.rooms.desert.kesh.cool, f = game.flags; if (f.k_done) return null; const r = P.use(C.crank.x, C.crank.z, { kind: 'kcrank', near: 0.9 }); P.wait(2); return { label: r.target?.label, dir: f.k_dir, done: !!f.k_done, sand: !!f.k_sand }; }); if (!r) break; log('turn', r); log('turn lines', await said()); }
    log('sani spot ch5', await ev(() => { const C = game.rooms.desert.kesh.cool, s = P.npc('dkid'); return { d: +Math.hypot(s.pos.x - C.sani.x, s.pos.z - C.sani.z).toFixed(2), anim: s.forceAnim }; }));
    log('brosk (done, no water yet)', await ev(() => { const r = P.talk('dtrader'); return { r: r.r, paid: !!game.flags.k_paid, owe: game.flags.k_owe || 0, jar: !!game.flags.c5_jar }; })); log('brosk 3 lines', await said());
    log('end', await KS());
  }

  if (SC === 'board') {
    await boot('continue');
    log('start', await KS());
    // from the plaza toward the berth, as a player coming to Hesk
    log('walk', await ev(() => { const D = game.rooms.desert; const b = D.kesh.board; const r = P.go(b.x - 3.0, b.z - 3.4, { tol: 0.6, maxT: 120 }); P.face(b.x, b.z); P.wait(1.2); return { r: r.r, ferryTaken: !!game.flags.c5_ferryTaken }; }));
    await shot('board-' + (process.env.TAG || 'x'));
    log('vis board', await ev(() => { const b = game.rooms.desert.kesh.board; return [b.x, game.physics.groundAt(b.x, b.z, 30) + 1.7, b.z]; }).then((p) => vis({ board: p })));
  }

  // ==================================================================================== render counts (ISO)
  if (SC === 'perf') {
    await boot(process.env.LOAD ? 'continue' : 'new');
    iso('the hero is placed at fixed spots (same on both builds) and the frame drawn from the normal camera; counts, not time');
    const spots = { pier_track_east: [-86, 4, Math.PI / 2], cool_door: [-69.2, 0.2, Math.PI + 0.3], plaza: [-50, 2, 0.4], lumi_loom: [-61.5, 3.0, Math.PI * 0.75], drift: [-2, 11, Math.PI / 2 + 0.15], board: [-27.5, 12.4, 1.14] };
    const res = {};
    for (const [n, [x, z, a]] of Object.entries(spots)) {
      res[n] = await ev(([x, z, a]) => { const G = game, h = G.hero; h.pos.set(3400 + x, G.physics.groundAt(3400 + x, z, 30), z); h.angle = a; h.onGround = true; h.vy = 0; G.camRig.lba.init = false; G.step(1.2);
        const R = G.renderer, r3 = R.renderer || R.r || R.gl || R.three; const info = (r3 && r3.info) || R.info; if (info) { info.autoReset = false; info.reset(); }
        R.render(); return info ? { calls: info.render.calls, tris: info.render.triangles, geos: info.memory.geometries, tex: info.memory.textures } : { err: Object.keys(R).slice(0, 20) }; }, [x, z, a]);
      if (process.env.SHOTS) await page.screenshot({ path: path.join(SHOTS, `perf-${process.env.TAG}-${n}.png`) });
    }
    log('render counts (' + (process.env.TAG || '') + ')', res);
  }
} catch (e) { console.log('ERROR ' + e.message); }
if (process.env.KEEP) { await quitAndKeep(page, context, process.env.KEEP); console.log('kept ' + process.env.KEEP); }
console.log(errs.join('\n') || 'no errors');
fs.writeFileSync(path.join(DIR, SC + (process.env.TAG ? '-' + process.env.TAG : '') + '.json'), JSON.stringify(out, null, 1));
await browser.close();
