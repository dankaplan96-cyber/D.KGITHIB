// REV-TY-2 review runner (independent of tests/workshop.mjs). node rev.mjs <scenario>
// GAME_URL selects the server; LOAD=<storage.json> continues from a real save; KEEP=<storage.json> keeps the save at
// the end (Esc -> Save & quit). Input harness: tests/lib/player.js (window.P). Screenshots -> shots/ (PNG; the cited
// ones are converted to JPEG afterwards).
// Scenarios:
//   main   (LOAD = chained save at Zeelich arrival): walk in, readability per spot, collision, givers, Baldino's talks,
//          the pair through failures and adjacent cases (leave room, pause, crank down while synced, close tap), success,
//          reward, no duplicates. KEEP2=<file> keeps a save "ready" (hoist up, tap open, pair off) before success.
//   pre    (LOAD = arrival save): the pair before Baldino's introduction.
//   loss   (LOAD = "ready" save): success, then Save & quit before the coin is picked up.
//   absent (LOAD = a save after the platform shield, Baldino outside): the pair with Baldino away (fee tin).
//   zoeres (LOAD = a save during Zoe's lighthouse sequence): Continue, talk to Baldino: the main path resumes.
//   ch10   (ISO: chapter set by flags, as tests/chapter10.mjs): line order with and without w_pair.
import { launch, open, menu, quitAndKeep } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const SC = process.argv[2];
const SHOTS = path.join(DIR, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const out = {};
const log = (k, v) => { out[k] = v; console.log(k + ': ' + JSON.stringify(v)?.slice(0, 1400)); };
const { browser, context, page, errs } = await launch({ storageState: process.env.LOAD, width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const hook = () => ev(() => { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines.map((l) => (n ? n + ': ' : '') + l)); return sv.call(this, n, lines, ...a); };
  const tv = game.hud.toast.bind(game.hud); game.hud.toast = (k, ...a) => { window._said.push('TOAST ' + k); return tv(k, ...a); }; });
const boot = async (act) => { await open(page, '?nocine'); await menu(page, act); await ev(() => P.settle()); await hook(); };
const said = () => ev(() => { const s = window._said.slice(); window._said.length = 0; return s; });
const shot = async (name) => { await ev(() => { game.step(1 / 30); game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, `${SC}-${name}.png`) }); };
const ws = () => ev(() => { const L = game.rooms.workshop.life, f = game.flags, W = game.story.workshop; return { on: W.on, heat: +W.heat.toFixed(2), sync: +W.sync.toFixed(2), lift: +L.lift.toFixed(2), up: !!f.w_up, tap: !!f.w_tap, pair: !!f.w_pair, paid: !!f.w_paid, ask: !!f.w_ask, trips: f.w_trips || 0, room: game.room?.id ?? 'citadel', coins: game.hero.coins, state: game.state, chapter: f.chapterKey, coinPickups: game.pickups.list.filter((p) => p.type === 'coin').map((p) => [+(p.pos.x - 1500).toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.value]) }; });
// walk up to a workshop spot and press E on whatever prompt shows (no kind filter: what a player gets)
const useSpot = (what, kind = null) => ev(([what, kind]) => { const s = game.rooms.workshop.life.spots[what]; const r = P.use(s.x, s.z, { near: 0.5, kind }); return { r: r.r, tgt: r.target?.kind, label: r.target?.label }; }, [what, kind]);
const W0 = (x, z) => ({ x: 1500 + x, z });

// readability: from the current (normal, following) camera, is each point on screen and is it the first thing a ray
// from the camera hits? (rooms not shown, sprites and faint transparent planes are ignored)
const PTS = {
  lever: [-2.45, 1.17, 2.94], relayA_lamp: [-2.83, 1.41, 3.13], drawing: [-2.43, 0.87, 3.17], sync_lamps: [-1.9, 0.9, 2.9],
  coupler: [-1.6, 0.98, 3.04], drip_can: [-1.6, 1.45, 3.1], tin: [-2.92, 0.92, 2.9],
  relayB_low: [3.06, 0.89, 0.6], relayB_high: [3.06, 1.89, 0.6], hoist_crank: [2.57, 1.05, 0.24], hoist_plate: [3.17, 2.62, 0.67],
  fan: [-3.46, 1.18, -0.2], thunder_box: [-3.7, 2.34, -1.55], toy_mill: [-3.7, 2.53, -0.95],
  kettle: [0.6, 0.95, -3.12], tea_wall_mid: [0.6, 2.2, -3.45], tea_note: [0.48, 1.32, -3.44], lid: [0.6, 3.77, -3.42],
  ilo_perch: [-2.85, 0.6, 1.75], crate_label: [3.5, 0.32, 2.31], crate_top: [3.5, 0.62, 2.0], barrel_top: [3.55, 0.8, 2.95],
};
const vis = (names) => ev(async (args) => {
  const [PTS, names] = args;
  const THREE = await import('three');
  const cam = game.camera, cp = new THREE.Vector3(); cam.getWorldPosition(cp);
  const rc = new THREE.Raycaster();
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const owner = (o) => { for (let x = o; x; x = x.parent) { if (x === game.hero.rig?.root || x === game.hero.mesh) return 'TWINSEN'; for (const n of game.npcs) if (x === n.rig?.root || x === n.mesh) return 'NPC:' + n.def.id; } return null; };
  const meshes = []; game.scene.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && !o.isSprite && shown(o)) meshes.push(o); });
  rc.camera = cam;
  const res = {};
  for (const n of names) {
    const p = PTS[n], v = new THREE.Vector3(1500 + p[0], p[1], p[2]);
    const ndc = v.clone().project(cam);
    const on = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z < 1;
    const dir = v.clone().sub(cp), d = dir.length(); dir.normalize();
    rc.set(cp, dir); rc.far = d + 0.3;
    const hits = rc.intersectObjects(meshes, false).filter((h) => !(h.object.material?.transparent && (h.object.material.opacity < 0.6 || h.object.material.depthWrite === false)));
    const first = hits[0];
    const blocked = first && first.distance < d - 0.15;
    const bp = first?.point;
    res[n] = { on, px: [Math.round((ndc.x + 1) / 2 * innerWidth), Math.round((1 - ndc.y) / 2 * innerHeight)], visible: on && !blocked, by: blocked ? (owner(first.object) || (first.object.name || first.object.geometry?.type || 'mesh')) + ' @' + [bp.x - 1500, bp.y, bp.z].map((q) => q.toFixed(2)).join(',') : null };
  }
  return res;
}, [PTS, names]);
const visSummary = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.visible ? 'seen' : (v.on ? 'HIDDEN by ' + v.by : 'off-screen ' + v.px)]));

try {
  if (SC === 'main' || SC === 'pre') {
    await boot('continue');
    log('start', await ev(() => ({ ...P.state(), flags: Object.keys(game.flags).filter((k) => /^c2_|^w_/.test(k)) })));
    // ---- walk in by input (door from the Zeelich street)
    const ent = await ev(() => { const r = P.enter('workshop', { run: true }); P.settle(); P.wait(1.5); return { r: r.r, room: game.room?.id }; });
    log('enter', ent); log('enter lines', await said());
    await shot('00-entry');
    log('vis@entry', visSummary(await vis(Object.keys(PTS))));

    if (SC === 'pre') {
      // the test pair before Baldino's introduction: lever first
      log('lever before intro', await useSpot('lever')); log('lines', await said());
      log('state', await ws());
      await ev(() => { P.wait(3); P.settle(); }); log('after 3s lines', await said());
      // set it all up and succeed before ever talking to him
      log('crank', await useSpot('crank', 'wcrank')); await ev(() => P.wait(2)); log('crank lines', await said());
      log('tap', await useSpot('tap', 'wtap')); log('tap lines', await said());
      const st0 = await ws();
      if (!st0.on) { log('lever again', await useSpot('lever', 'wlever')); }
      await ev(() => { P.wait(11); P.settle(); P.wait(1.5); }); log('success lines (before intro)', await said()); log('state', await ws());
      await ev(() => { for (const p of [...game.pickups.list]) if (p.type === 'coin') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 }); P.settle(); });
      log('coins after pickup', await ws());
      log('talk 1 (intro?)', await ev(() => { const r = P.talk('baldino'); return { r: r.r, plan: !!game.flags.c2_plan }; })); log('talk 1 lines', await said());
      log('talk 2', await ev(() => { const r = P.talk('baldino'); return { r: r.r }; })); log('talk 2 lines', await said());
      log('journal', await ev(() => game.story.journal().map((c) => [c.title, c.lines.length])));
      log('final', await ws());
    }

    if (SC === 'main') {
      // ---- readability from the normal camera with Twinsen at each spot (and a capture there)
      for (const [spot, names] of [['lever', ['lever', 'relayA_lamp', 'drawing', 'sync_lamps', 'coupler', 'drip_can', 'tin', 'relayB_low', 'relayB_high']], ['tap', ['coupler', 'drip_can', 'sync_lamps']], ['crank', ['hoist_crank', 'relayB_low', 'relayB_high', 'hoist_plate']], ['fan', ['fan']], ['pulse', ['thunder_box', 'toy_mill']], ['kettle', ['kettle', 'tea_wall_mid', 'tea_note', 'lid']], ['crate', ['crate_label', 'crate_top', 'barrel_top']]]) {
        await ev((s) => { const p = game.rooms.workshop.life.spots[s]; P.go(p.x, p.z, { tol: 0.35 }); P.wait(1.5); }, spot);
        log('vis@' + spot, { prompt: await ev(() => P.target()?.label), ...visSummary(await vis(names)) });
        await shot('01-at-' + spot);
      }
      await said();

      // ---- collision around the new props (input walks; positions recorded)
      const col = await ev(() => {
        const out = {}, h = game.hero, C = 1500;
        const at = () => [+(h.pos.x - C).toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2)];
        // through the hoist's low side bar (x = 2.5, z 0.16..1.04, bar at y 0.55, no collider in the code) and the hanging relay (3.17, 0.6)
        P.go(C + 1.9, 0.6, { tol: 0.3 }); P.face(C + 4, 0.6); P.holdFor(['ArrowUp'], 0.7); out.into_bar = at();
        P.holdFor(['ArrowUp'], 0.6); out.into_cradle = at();
        P.holdFor(['ArrowUp'], 0.6); out.past_cradle = at();
        const r1 = P.go(C + 3.17, 0.6, { tol: 0.15, maxT: 10 }); out.stand_at_cradle = { r: r1.r, at: at() };
        // the relay table: can he walk into it / stand on it?
        P.go(C - 2.2, 2.2, { tol: 0.3 }); P.face(C - 2.2, 4); P.holdFor(['ArrowUp'], 1.0); out.into_table = at();
        // the fan stand by the left wall, the kettle stand at the back wall, Ilo's perch
        P.go(C - 3.0, -0.2, { tol: 0.3 }); P.face(C - 4, -0.2); P.holdFor(['ArrowUp'], 1.0); out.into_fan = at();
        P.go(C + 0.6, -2.4, { tol: 0.3 }); P.face(C + 0.6, -4); P.holdFor(['ArrowUp'], 1.0); out.into_kettle = at();
        P.go(C - 2.85, 1.0, { tol: 0.3 }); P.face(C - 2.85, 3); P.holdFor(['ArrowUp'], 1.0); out.into_perch = at();
        // from the door to the barrel and the crate, the way a player comes (round the hoist), and back to the door
        out.to_crate_north = P.go(C + 3.5, 1.4, { tol: 0.35, maxT: 40 }).r; out.at_crate_north = at();
        out.to_barrel = P.go(C + 3.0, 2.95, { tol: 0.4, maxT: 40 }).r;
        out.back_to_door = P.go(game.room.spawn.x, game.room.spawn.z, { tol: 0.5, maxT: 40 }).r;
        return out;
      });
      log('collision', col);
      await ev((p) => { P.go(p.x, p.z, { tol: 0.2 }); P.face(1504, 0.6); P.wait(0.5); }, W0(3.17, 0.6));
      await shot('02-under-hoist-down');

      // ---- the crate giver (0.24.0's life/magic bonus) next to Ilo's crate look: what does a hop by the crate do?
      const giv = await ev(() => {
        const C = 1500, h = game.hero, R = game.rooms.workshop, out = {};
        const key = 'giver:workshop:crate';
        out.searched0 = game.searched.includes(key);
        if (h.behaviour !== 'normal') P.tap('F1');
        out.beh = h.behaviour;
        // the side he arrives on from the door (north of the crate), facing it
        P.go(C + 3.45, 1.35, { tol: 0.25 }); P.face(C + 3.5, 2.0);
        out.north_prompt = P.target()?.label + ':' + P.target()?.kind;
        P.tap('KeyE', 0.1); P.settle(); P.wait(0.8);
        out.north_searched = game.searched.includes(key);
        // the west side, facing it
        P.go(C + 2.85, 2.05, { tol: 0.2 }); P.face(C + 3.5, 2.05);
        out.west_prompt = (P.target()?.label ?? 'none') + ':' + (P.target()?.kind ?? '');
        P.tap('KeyE', 0.1); P.settle(); P.wait(0.8);
        out.west_searched = game.searched.includes(key);
        out.pickups = game.pickups.list.filter((p) => Math.hypot(p.pos.x - (C + 3.5), p.pos.z - 2) < 3).map((p) => p.type);
        return out;
      });
      log('crate giver', giv); log('giver lines', await said());

      // ---- the looks (player: E at whatever prompt)
      for (const w of ['fan', 'pulse', 'kettle', 'crate']) { log('look ' + w, await useSpot(w)); log('look ' + w + ' lines', await said()); }

      // ---- Baldino: first talk (main intro), then the side task, then his years
      for (let i = 1; i <= 9; i++) { const r = await ev(() => { const r = P.talk('baldino'); return { r: r.r, plan: !!game.flags.c2_plan, ask: !!game.flags.w_ask, n: game.flags.w_n }; }); log('talk ' + i, { ...r, lines: await said() }); }
      log('objective', await ev(() => P.state().obj));
      // the workbench (key) prompt and the kettle look: who wins where a player stands at the bench?
      log('bench prompt', await ev(() => { const s = game.room.searches.find((x) => x.id === 'bench'); const out = []; for (const dx of [-0.4, 0, 0.4, 0.8]) { P.go(s.x + dx, s.z, { tol: 0.2 }); P.face(s.x + dx, s.z - 2); out.push([dx, P.target()?.label, P.target()?.kind]); } return out; }));
      await said();

      // ---- failure 1: lever with the hoist down (dialogue played through); then leave the room while it runs
      log('lever (hoist down)', await useSpot('lever')); await ev(() => { P.wait(2.5); P.settle(); }); log('A state', await ws()); log('A lines', await said());
      await shot('03-no-sight');
      const leave = await ev(() => { const W = game.story.workshop, on0 = W.on, h0 = +W.heat.toFixed(2); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); const out1 = game.room?.id ?? 'citadel'; P.wait(1); const d = game.rooms.zeelich.workshopDoor; P.through(d.x, d.z); P.settle(); return { on0, h0, out1, back: game.room?.id }; });
      log('left while running and came back', { leave, st: await ws() }); log('lines', await said());
      // ---- pause while it heats (hoist down: no sync): the heat must not advance; then it trips
      log('lever', await useSpot('lever', 'wlever')); await ev(() => { P.wait(2); P.settle(); P.wait(1); }); await said();
      log('pause', await ev(() => { const W = game.story.workshop, h0 = W.heat; P.tap('Escape', 0.1); const s1 = game.state; P.wait(20); const h1 = W.heat; P.tap('Escape', 0.1); P.wait(0.1); return { s1, s2: game.state, h0: +h0.toFixed(3), h1: +h1.toFixed(3), on: W.on }; }));
      await ev(() => { P.wait(1.5); }); await shot('04-glowing');
      await ev(() => { let t = 0; while (game.story.workshop.on && t < 12) { P.wait(0.5); t += 0.5; } P.settle(); }); log('B (trip) state', await ws()); log('B lines', await said());
      // restart right after the trip
      log('lever after trip', await useSpot('lever', 'wlever')); await ev(() => { P.wait(1); }); log('C state', await ws()); await ev(() => { P.settle(); P.wait(1); }); await said();
      log('switch off', await useSpot('lever', 'wlever')); await said();
      // ---- crank up; tap open; on; close the tap mid-run: it must heat and trip
      log('crank up', await useSpot('crank', 'wcrank')); await ev(() => { P.wait(2); P.settle(); }); log('crank lines', await said());
      await shot('05-hoist-up');
      log('tap open', await useSpot('tap', 'wtap')); log('tap lines', await said());
      log('switch on', await useSpot('lever', 'wlever')); await ev(() => P.wait(0.8)); log('linked+cool', await ws());
      log('tap close mid-run', await useSpot('tap', 'wtap')); await said(); log('tap closed', await ws());
      await ev(() => { let t = 0; while (game.story.workshop.on && t < 15 && !game.flags.w_pair) { P.wait(0.5); t += 0.5; } P.settle(); }); log('after tap closed', await ws()); log('lines', await said());
      log('tap open again', await useSpot('tap', 'wtap')); await said();
      if (process.env.KEEP2) { await quitAndKeep(page, context, process.env.KEEP2); await boot('continue'); log('ready save kept', await ws()); }
      // ---- lower the hoist while it syncs (at about half): the sync must reset; raise it again; success at the crank
      log('switch on (for crank test)', await useSpot('lever', 'wlever'));
      log('to crank', await ev(() => { const s = game.rooms.workshop.life.spots.crank; P.go(s.x, s.z, { tol: 0.5 }); P.face(s.x, s.z + 0.6); const W = game.story.workshop; return { sync: +W.sync.toFixed(2), target: P.target()?.kind }; }));
      log('crank down mid-sync', await ev(() => { const W = game.story.workshop; const s0 = +W.sync.toFixed(2); P.tap('KeyE', 0.1); P.wait(1.2); P.settle(); const s1 = +W.sync.toFixed(2); P.wait(1.6); return { s0, s1, up: !!game.flags.w_up, lift: +game.rooms.workshop.life.lift.toFixed(2), pair: !!game.flags.w_pair }; }));
      await said();
      const c0 = (await ws()).coins;
      log('crank up again', await ev(() => { P.tap('KeyE', 0.1); P.wait(1.2); P.settle(); return { up: !!game.flags.w_up }; }));
      await ev(() => P.wait(5)); await shot('06-syncing'); log('syncing', await ws());
      await ev(() => { let t = 0; while (!game.flags.w_pair && t < 12) { P.wait(0.5); t += 0.5; } P.settle(); P.wait(1.5); }); log('success state', await ws()); log('success lines', await said());
      await shot('07-talking-coin');
      const got = await ev(() => { for (const p of [...game.pickups.list]) if (p.type === 'coin') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 }); P.settle(); return game.hero.coins; });
      log('reward', { c0, got, delta: got - c0 });
      // ---- no duplicate reward: talk again x3, lever/tap/crank after, leave & re-enter
      for (let i = 0; i < 3; i++) { await ev(() => P.talk('baldino')); log('talk after ' + i, { lines: await said(), st: await ws() }); }
      for (const w of ['lever', 'tap', 'crank']) { log(w + ' after', await useSpot(w)); log(w + ' after lines', await said()); }
      await ev(() => { const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.wait(1); const d = game.rooms.zeelich.workshopDoor; P.through(d.x, d.z); P.settle(); P.wait(2); });
      log('re-entered', await ws()); await said();
      await shot('08-after-reentry');
      log('vis after (pair talking)', visSummary(await vis(['relayA_lamp', 'relayB_high', 'sync_lamps', 'coupler'])));
      log('journal', await ev(() => game.story.journal().map((c) => [c.title, c.lines])));
      log('end', await ws());
    }
  }

  if (SC === 'race') {
    // LOAD = "ready" save (hoist up, tap open, pair off). A player who presses E at the crank (or the tap, RACE=tap)
    // just as the pair completes: is the press applied after success?
    const what = process.env.RACE || 'crank';
    await boot('continue');
    log('loaded', await ws());
    log('switch on', await useSpot('lever', 'wlever'));
    log('to ' + what, await ev((w) => { const s = game.rooms.workshop.life.spots[w]; P.go(s.x, s.z, { tol: 0.5 }); P.face(s.x, s.z + (w === 'crank' ? 0.6 : 1)); return { sync: +game.story.workshop.sync.toFixed(2), target: P.target()?.kind }; }, what));
    log('press at sync ~0.98', await ev(() => { const W = game.story.workshop; while (W.sync < 0.985 && W.on) game.step(1 / 60); const s0 = +W.sync.toFixed(3); P.tap('KeyE', 0.02); const pairAtPress = !!game.flags.w_pair; P.wait(1.5); P.settle(); P.wait(2); return { s0, pairAtPress, pair: !!game.flags.w_pair, up: !!game.flags.w_up, tap: !!game.flags.w_tap, lift: +game.rooms.workshop.life.lift.toFixed(2) }; }));
    log('lines', await said());
    await ev(() => { for (const p of [...game.pickups.list]) if (p.type === 'coin') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 }); P.settle(); });
    log('after', { st: await ws(), relayB: await ev(() => { const L = game.rooms.workshop.life; return { state: { ...L.state }, lift: L.lift }; }) });
    log('crank now', await useSpot('crank')); log('crank now lines', await said());
    log('tap now', await useSpot('tap')); log('tap now lines', await said());
    await ev(() => { const s = game.rooms.workshop.life.spots.lever; P.go(s.x, s.z, { tol: 0.4 }); P.wait(0.5); });
    await shot('after');
    const file = path.join(DIR, 'save-race-' + what + '.json');
    await quitAndKeep(page, context, file); await boot('continue');
    await ev(() => { P.wait(1); });
    log('after Continue', { st: await ws(), relayB: await ev(() => { const L = game.rooms.workshop.life; return { state: { ...L.state }, lift: L.lift }; }) });
    await shot('after-continue');
  }

  if (SC === 'tapshut') {
    // LOAD = "ready" save. Run with the drip open for a while, then shut the tap (as a player experimenting would)
    await boot('continue');
    log('loaded', await ws());
    log('switch on', await useSpot('lever', 'wlever'));
    await ev(() => P.wait(4)); log('linked, cool', await ws());
    log('tap close', await useSpot('tap', 'wtap')); log('tap close lines', await said()); log('tap closed', await ws());
    await ev(() => { let t = 0; while (game.story.workshop.on && t < 15 && !game.flags.w_pair) { P.wait(0.25); t += 0.25; } }); log('end of run', await ws());
    await ev(() => { P.settle(); P.wait(1.5); }); log('lines', await said());
    await ev(() => { for (const p of [...game.pickups.list]) if (p.type === 'coin') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 }); P.settle(); });
    log('tap look now', await useSpot('tap')); log('tap look lines', await said());
    await ev(() => { const s = game.rooms.workshop.life.spots.tap; P.go(s.x, s.z, { tol: 0.4 }); P.wait(0.5); });
    await shot('after');
    log('state', { st: await ws(), L: await ev(() => ({ ...game.rooms.workshop.life.state })) });
  }

  if (SC === 'loss') {
    await boot('continue');
    const s0 = await ws(); log('loaded (ready)', s0);
    log('switch on', await useSpot('lever', 'wlever'));
    await ev(() => { P.wait(11); P.settle(); }); log('success', await ws()); log('lines', await said());
    // Save & quit right away (the coin still in the air / on the floor), then Continue
    const file = path.join(DIR, 'save-loss.json');
    await quitAndKeep(page, context, file); await boot('continue');
    log('after continue', await ws());
    await ev(() => P.talk('baldino')); log('talk after continue', { lines: await said(), st: await ws() });
  }

  if (SC === 'absent') {
    await boot('continue');
    log('loaded', { st: await ws(), bal: await ev(() => { const b = P.npc('baldino'); return b ? { present: b.present, at: [b.pos.x, b.pos.z] } : null; }), f: await ev(() => Object.keys(game.flags).filter((k) => /^c2_|^w_/.test(k))) });
    const ent = await ev(() => { const r = P.enter('workshop', { run: true }); P.settle(); P.wait(1); return { r: r.r, room: game.room?.id, balHere: game.story.workshop.balHere() }; });
    log('enter', ent); await said();
    for (const w of ['fan', 'kettle']) { log('look ' + w, await useSpot(w)); log('lines', await said()); }
    log('crank', await useSpot('crank', 'wcrank')); await ev(() => P.wait(2)); log('tap', await useSpot('tap', 'wtap')); await said();
    log('lever', await useSpot('lever', 'wlever')); await ev(() => { P.wait(11); P.settle(); P.wait(1.5); });
    log('success (absent)', await ws()); log('lines', await said());
    await shot('tin-coin');
    const got = await ev(() => { const c0 = game.hero.coins; for (const p of [...game.pickups.list]) if (p.type === 'coin') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 }); P.settle(); return { c0, c1: game.hero.coins }; });
    log('tin reward', got);
    log('end', await ws());
  }

  if (SC === 'zoeres') {
    await boot('continue');
    log('loaded', { st: await ws(), p: await ev(() => P.state()), f: await ev(() => Object.fromEntries(Object.entries(game.flags).filter(([k]) => /^c2_(key|zoe|broad)|^w_/.test(k)))) });
    log('talk baldino', await ev(() => { const r = P.talk('baldino'); P.wait(1); P.settle(); return { r: r.r, room: game.room?.id, zoeStart: !!game.flags.c2_zoeStart }; }));
    log('lines', await said());
  }

  if (SC === 'ch10') {
    // ISO (chapter 9 done by flags, as tests/chapter10.mjs); PAIR=1 with the test pair done in chapter 3
    const pair = !!process.env.PAIR;
    await boot('new');
    await ev((pair) => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 8, chapterKey: 'council', c1_done: true, c1_plan: true, c2_plan: true, c2_key: true, c2_shield: true, c2_broadcast: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true, c9_started: true, c9_vote: true, ...(pair ? { w_ask: true, w_pair: true, w_paid: true, w_up: true, w_tap: true } : {}) }); game.hero.swapBody?.('twinsen'); game.hero.hasBall = true; game.story.applyFlags(); }, pair);
    log('thunder box before ch10', await ev(() => game.rooms.workshop.life.state.pulse));
    await said();
    await ev(() => { game.story.nextChapter(); P.settle(); });
    log('ch10 opening', await said());
    log('after', await ev(() => ({ room: game.room?.id, pulse: game.rooms.workshop.life.state.pulse, done: game.rooms.workshop.life.state.done, hasPulse: game.hero.hasPulse })));
    log('pulse look', await useSpot('pulse')); log('pulse look lines', await said());
    if (pair) { await ev(() => P.wait(1)); await shot('workshop'); }
  }
} catch (e) { console.log('ERROR', e.message.split('\n').slice(0, 3).join(' ')); }
fs.writeFileSync(path.join(DIR, `rev-${SC}.json`), JSON.stringify(out, null, 1));
if (process.env.KEEP) { try { await quitAndKeep(page, context, process.env.KEEP); console.log('kept', process.env.KEEP); } catch (e) { console.log('KEEP failed', e.message); } }
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
