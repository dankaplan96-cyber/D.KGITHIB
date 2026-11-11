// The new-game opening (src/game/story/opening.js on src/engine/cinematic.js):
//   1. it plays through and hands over in the house: control, the first objective, the save, the cast placed
//   2. skipping at the start, during the dialogue and during the title ends in the same state
//   3. pause / resume stops the clock (and the sound)
//   4. Continue from the save after the opening: no replay
//   5. a second new game: no duplicated props, characters or flags
//   6. the first objective is playable (the door wants the ball; the cupboard gives it)
//   7. every spoken line babbles in its speaker's voice (voice.js); every character on screen is from the poly cast
//      (assets/poly/*.json); nobody vanishes or jumps on screen (only under a dip to black, the door transition)
//   8. OPEN-3: every actor's per-frame path stays out of the colliders (walls, furniture, fences, railings, the pier's)
//      and out of the other actors while the screen isn't black
//   9. R5: Zoé's hand (the skinned hand's vertices, CHAR-2's longer hand) is on the tap's handle every frame it turns,
//      and in the stream under the spout; standing feet don't jump; the scene's pose layers are off every joint after
//      it (no hand bone left turned), played or skipped
//  10. OPEN-FILM: every line's speaker's mouth moves with it (the harbour's worker and resident, scene-only actors,
//      too); no line plays the rig's looping talk gesture; the aerial move doesn't stop between 3 and 12.5 s; every
//      footstep heard falls within 0.1 s of one of Zoé's feet coming down
//  11. NO-AIR (the user, 10.11.2026: "the actions they do in the air"): every hand that works in the film is on the thing
//      it works at, measured against the drawn triangles (tests/lib/contact.js), and the thing answers: the worker's hand
//      on the lift's lever while the lever is thrown; both his hands on the crate's top as it comes down to the deck (and
//      not through it); the screwdriver's tip in the lamp's screw and the screw turning in, Twinsen's other hand on the
//      shade; Arthur's left hand on his hull, the mast seated by his right hand (home in its step before he lets go, and
//      not moving as he does), then that hand on the deck; Zoé's palms on the tray's soil; the screwdriver not moving as
//      it is laid down; everybody's standing feet on the ground
//   (R5: the scene's dips now come back up on its own clock, so 7 and 8 cover the whole scene: with wall-clock timers the
//   stepped frames read as black from 28.6 s on and these checks only ever saw the harbour; a cut to another shot is
//   not a vanishing)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch as watchPage, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = watchPage(page);
const ev = (f, a) => page.evaluate(f, a);
const { check, done } = checker({ info: 'always' });

const boot = async (mode, clear = true) => {
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/'), { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: +(process.env.BOOT_MS || 240000) });
  if (clear) await ev(() => localStorage.clear());
  await ev(() => { game.testFreeze = true; });
  if (mode === 'new') {
    await page.click('[data-act="new"]', { timeout: 180000 });
    // with a save present New Game asks first (7fcaade): confirm
    if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]', { timeout: 180000 });
    await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: +(process.env.BOOT_MS || 240000) });
    await ev(async () => { window.__cine = game.cine; await game.audio.ctx?.resume?.(); });
  } else if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
};
// advance the game clock by s seconds at 30 fps
const run = (s) => ev((s) => { for (let i = 0, n = Math.round(s * 30); i < n; i++) game.frame(1 / 30, false); }, s);
const runTo = (t) => ev((t) => { for (let i = 0; i < 6000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false); return game.cine?.t; }, t);
const holdSkip = async () => {
  await page.keyboard.down('KeyE');
  await run(1.2);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(700); // (the skip's dip to black)
  await run(0.2);
};
// the state the opening must leave, however it ended
const endState = () => ev(() => {
  const G = game, f = G.flags, zoe = G.npcs.find((n) => n.def.id === 'zoe'), ar = G.npcs.find((n) => n.def.id === 'arthur');
  const water = G.world.houses.find((h) => h.id === 'nbr'); // (Zoé's "next door": the neighbours by Twinsen's house)
  const save = JSON.parse(localStorage.getItem('lba3_save_v1') || 'null');
  return {
    state: G.state, room: G.room?.id, cine: !!G.cine, camCine: !!G.camRig.cine, hud: !document.querySelector('#hud').classList.contains('hidden'),
    cineUI: !document.querySelector('#cine').classList.contains('hidden'), fade: document.querySelector('#fade').classList.contains('on'),
    intro: !!f.intro, opening: !!f.opening, ball: !!G.hero.hasBall,
    objective: document.querySelector('#pause-objective').textContent.trim(), objectiveShown: G.hud.objT > 0 && !(G.hud.toastLog || []).some((m) => m.startsWith('Check the well')), // (CLAR-2: the panel comes up for a few seconds as control comes back, in either HUD; no toast repeats it)
    zoeOut: zoe.present && Math.hypot(zoe.pos.x - water.door.x, zoe.pos.z - water.door.z) < 2, zoeControlled: !!zoe.controlled,
    arthur: [ar.forceAnim, !!ar.controlled], hero: [+(G.hero.pos.x - G.rooms.house.center.x).toFixed(2), +G.hero.pos.z.toFixed(2)],
    lift: +G.world.cargoLift.u.toFixed(2), stream: G.rooms.house.kitchen.stream.visible, sd: G.rooms.house.table.screwdriver.parent === G.rooms.house.group,
    saved: !!save?.flags?.opening, savedRoom: save?.room,
    sceneKids: G.scene.children.length,
    // (R5: the scene's grips turn hand bones, which the gameplay rig never touches: they must be back at rest)
    // (NO-AIR: but for someone whose hands the game itself now holds on what they work at — Arthur at his boat: workhands.js)
    handsTurned: [G.hero, zoe, ar].filter((a) => !a.rig._ov?.length).reduce((n, a) => n + ['armL', 'armR'].reduce((m, s) => m + Math.abs(a.rig.j[s].hand.rotation.x) + Math.abs(a.rig.j[s].hand.rotation.y) + Math.abs(a.rig.j[s].hand.rotation.z), 0), 0) < 1e-6,
  };
});
const good = (s) => s.state === 'play' && s.room === 'house' && !s.cine && !s.camCine && s.hud && !s.cineUI && !s.fade && s.intro && s.opening && !s.ball
  && s.objective.startsWith('Check the well') && s.objective.includes('Take the magic ball from the cupboard') && s.objectiveShown && s.zoeOut && !s.zoeControlled && s.arthur[0] === 'kneelWork' && !s.arthur[1] && s.lift === 1 && !s.stream && s.sd && s.saved && s.savedRoom === 'house' && s.handsTurned;

// ---------------------------------------------------------------- 1. full playback
await boot('new');
const during = await ev(() => ({ state: game.state, hud: !document.querySelector('#hud').classList.contains('hidden'), prompt: document.querySelector('#prompt')?.classList.contains('show') ?? false, saved: !!localStorage.getItem('lba3_save_v1') }));
check('opening starts as a cinematic with the HUD hidden and nothing saved', during.state === 'cinematic' && !during.hud && !during.prompt && !during.saved, during);
// the whole scene, frame by frame (30 fps): who is on screen, from which model, and whether anyone vanishes or
// jumps while the picture is up
const polySizes = await ev(async () => {
  const names = await (await fetch('assets/poly/index.json')).json(), o = {};
  for (const n of names) { const j = await (await fetch(`assets/poly/${n}.json`)).json(); o[j.pos.length / 3] = (o[j.pos.length / 3] || []).concat(n); }
  return o;
});
await page.addScriptTag({ path: fileURLToPath(new URL('./lib/contact.js', import.meta.url)) });
const watch = await ev((polySizes) => {
  const G = game, c = G.cine, cam = G.camera, v = new G.camera.position.constructor();
  // NO-AIR: the hands' gaps (m) in the beats' own windows; lim: 3 cm
  const NA = { lim: 0.03, lever: { n: 0, max: 0, off: [] }, crate: { n: 0, max: 0, off: [] }, tool: { n: 0, max: 0, off: [] }, shade: { n: 0, max: 0, off: [] }, hull: { n: 0, max: 0, off: [] }, deck: { n: 0, max: 0, off: [] }, pots: { n: 0, max: 0, off: [] },
    through: 0, leverAt: {}, crateY: {}, screw: {}, mastSeat: null, mastJump: null, toolJump: null, feet: [] };
  const within = (t, W) => W.some(([a, b]) => t >= a && t <= b);
  const rec = (o, d, t) => { o.n++; if (d == null) d = 9; if (d > o.max) o.max = +d.toFixed(4); if (d > NA.lim && o.off.length < 5) o.off.push([+t.toFixed(2), +d.toFixed(3)]); };
  const LIFT = G.world.cargoLift, HOUSE = G.rooms.house, TBL = HOUSE.table, BOAT = HOUSE.boat, HR = [HOUSE.group];
  const P3 = () => new v.constructor();
  let heldPrev = null;
  const cast = { twinsen: G.hero, zoe: G.npcs.find((n) => n.def.id === 'zoe'), arthur: G.npcs.find((n) => n.def.id === 'arthur') };
  const seen = new Set(), notPoly = [], pops = [], subsAt = [], solids = [], bumps = [];
  let prev = {}, lastSub = '', mid = null;
  // R5: Zoé's right hand against the tap's handle (a disc of the cross's radius) and the stream's axis
  const K = G.rooms.house.kitchen, zj = cast.zoe.rig.j, hand = { on: 0, off: [], wet: 0, dry: [] };
  let zMesh = null; cast.zoe.rig.root.traverse((o) => { if (o.isSkinnedMesh && !zMesh) zMesh = o; });
  const hIdx = [];
  { const bi = zMesh.skeleton.bones.indexOf(zj.armR.hand), si = zMesh.geometry.attributes.skinIndex, sw = zMesh.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi && sw.getComponent(i, k) > 0.5) { hIdx.push(i); break; } }
  const handPts = () => { cast.zoe.rig.root.updateMatrixWorld(true); return hIdx.map((i) => zMesh.getVertexPosition(i, new v.constructor()).applyMatrix4(zMesh.matrixWorld)); };
  const TURNS = [[41.5, 42.2], [44.05, 44.5], [58.6, 59.1], [69.45, 69.85]], WET = [60.3, 62.0];
  const feetPrev = {}, footJumps = [];
  // OPEN-FILM: each line's speaker moves their mouth (the harbour's two included); no line plays the rig's looping talk
  // gesture; the aerial move (0-13 s) never stops; each footstep heard is a foot coming down (Zoé's walks)
  const speakerOf = { n_zoe: cast.zoe, n_hero: cast.twinsen, n_arthur: cast.arthur, n_worker: c.extras?.worker, n_resident: c.extras?.resident };
  const mouthBy = {}, talking = [], aerial = { min: 99, at: null }, footDown = [], stepsHeard = [];
  const play0 = G.audio.play.bind(G.audio);
  G.audio.play = (n, ...r) => { if (/^step-/.test(n) && G.cine) stepsHeard.push(+G.cine.t.toFixed(3)); return play0(n, ...r); };
  const zf = { L: { h: null, hi: -1, down: false, t: 0 }, R: { h: null, hi: -1, down: false, t: 0 } };
  let camPrev = null;
  // OPEN-3: every actor's path, frame by frame, stays out of the solids (walls, furniture, counters, fences,
  // railings: the physics colliders taller than the floor they stand on) and out of each other while the picture is
  // up. BODY is a body's half-width at the hips (the gameplay radius, 0.45, also keeps a reach's distance free);
  // two people never come closer than 2 × BODY.
  const BODY = 0.22, P = G.physics, everyone = { ...cast, ...(c.extras || {}) };
  const solidAt = (a) => {
    for (const k of P.near(a.pos.x, a.pos.z)) {
      if (!k.enabled || k.top < a.pos.y + 0.25 || k.bottom > a.pos.y + 1.6) continue;
      if (P._inside(k, a.pos.x, a.pos.z, BODY)) return k;
    }
    return null;
  };
  const onScreen = (o) => { o.getWorldPosition(v); const d = v.distanceTo(cam.position); v.project(cam); return v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && d < 40; };
  for (let i = 0; i < 4000 && G.cine; i++) {
    G.frame(1 / 30, false);
    if (!G.cine) break;
    cam.updateMatrixWorld();   // (an unrendered step leaves the camera's matrices a frame behind its placement: a cut read late)
    if (!mid && c.t > 31) mid = { room: G.room?.id, saved: !!localStorage.getItem('lba3_save_v1') };
    const dark = document.querySelector('#fade').classList.contains('on');
    const shotNow = c.def.shots.findIndex((sh) => c.t >= sh.t0 && c.t < sh.t1);
    // every visible skinned character in view: its mesh must be one of the poly cast's
    G.scene.traverseVisible((o) => {
      if (!o.isSkinnedMesh || o.material?.depthFunc === 5 /* (the hero's silhouette) */ || !onScreen(o)) return;
      const names = polySizes[o.geometry.attributes.position.count];
      if (names) names.forEach((n) => seen.add(n)); else if (notPoly.length < 5) notPoly.push({ t: +c.t.toFixed(2), n: o.geometry.attributes.position.count });
    });
    // the family: on screen one frame and gone (or a metre away) the next, without a dip to black
    for (const [id, a] of Object.entries(cast)) {
      const vis = a.rig.root.visible && (id !== 'zoe' || a.present) && (!G.room || Math.abs(a.pos.x - G.room.center.x) < 30) && onScreen(a.rig.root);
      const p = prev[id];
      // (vanishing: hidden or taken out of the scene while on screen; walking out of the frame or the camera moving on is not)
      const gone = !a.rig.root.visible || (id === 'zoe' && !a.present) || (G.room && Math.abs(a.pos.x - G.room.center.x) >= 30);
      if (p && p.vis && !dark && !p.dark && ((gone && p.shot === shotNow) || Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 0.8)) pops.push({ id, t: +c.t.toFixed(2), vis, from: [p.x, p.z].map((x) => +x.toFixed(1)), to: [a.pos.x, a.pos.z].map((x) => +x.toFixed(1)) });
      prev[id] = { vis, x: a.pos.x, z: a.pos.z, dark, shot: shotNow };
    }
    if (!dark) {
      const shown = Object.entries(everyone).filter(([id, a]) => a.rig.root.visible && a.rig.root.parent && (id !== 'zoe' || a.present) && (!G.room || Math.abs(a.pos.x - G.room.center.x) < 30));
      for (const [id, a] of shown) {
        const k = solidAt(a);
        if (k && solids.length < 12) solids.push({ id, t: +c.t.toFixed(2), at: [a.pos.x, a.pos.z].map((x) => +x.toFixed(2)), solid: [k.type, +k.x.toFixed(2), +k.z.toFixed(2), +k.top.toFixed(2)] });
      }
      for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
        const [ia, a] = shown[i], [ib, b] = shown[j], d = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
        if (d < 2 * BODY && Math.abs(a.pos.y - b.pos.y) < 1.5 && bumps.length < 12) bumps.push({ t: +c.t.toFixed(2), who: [ia, ib], d: +d.toFixed(2) });
      }
    }
    // NO-AIR
    if (!dark) {
      const t = c.t, wk = c.extras.worker, tw = cast.twinsen, ar = cast.arthur, zo = cast.zoe;
      if (!G.room && t > 13 && t < 29) {
        if (within(t, [[14.3, 16.5], [20.5, 23.0]])) { G.scene.updateMatrixWorld(); rec(NA.lever, CT.handTo(wk, 'L', LIFT.lever, { tool: false }), t); }
        for (const k of [13.6, 15.2, 22.0]) if (Math.abs(t - k) < 0.02) NA.leverAt[k] = +LIFT.lever.rotation.z.toFixed(3);
        if (within(t, [[26.1, 27.15]])) {
          G.scene.updateMatrixWorld();
          for (const sd of ['R', 'L']) rec(NA.crate, CT.handTo(wk, sd, LIFT.crate, { tool: false }), t);
          NA.through = Math.max(NA.through, CT.inBox([...CT.hand(wk.rig, 'R'), ...CT.hand(wk.rig, 'L')], LIFT.crate, { min: [-0.4, -0.4, -0.4], max: [0.4, 0.4, 0.4] }));
          const y = LIFT.crate.getWorldPosition(P3()).y; NA.crateY.from ??= +y.toFixed(3); NA.crateY.to = +y.toFixed(3);
        }
      }
      if (G.room === HOUSE) {
        const heavy = i % 2 === 0;
        if (heavy) G.scene.updateMatrixWorld();
        if (within(t, [[29.2, 31.2], [35.8, 45.8]])) {
          rec(NA.tool, CT.near(CT.tool(tw.rig, 'R', 9999), [TBL.lamp.screw], { max: 0.5 }).d, t);
          if (heavy) rec(NA.shade, CT.handGap(tw, 'L', HR, 0.5).d, t);
        }
        for (const k of [29.1, 45.9]) if (Math.abs(t - k) < 0.02) NA.screw[k] = [+TBL.lamp.screw.rotation.z.toFixed(2), +(TBL.lamp.screw.position.distanceTo(TBL.lamp.at) * 1000).toFixed(1)];
        if (heavy && within(t, [[29.2, 31.0], [35.6, 53.6]])) rec(NA.hull, CT.handGap(ar, 'L', HR, 0.5).d, t);
        if (heavy && within(t, [[37.6, 53.6]])) rec(NA.deck, CT.handGap(ar, 'R', HR, 0.5).d, t);
        // (her right hand comes a few cm off the soil while she turns to look over at Arthur, 36.4-37.6: not counted)
        if (heavy && within(t, [[29.2, 36.3], [37.7, 39.2]])) for (const sd of ['R', 'L']) rec(NA.pots, CT.handGap(zo, sd, HR, 0.5).d, t);
        // the mast: where its foot is against its fitted place while he still holds it; how far it moves as he lets go
        const mast = BOAT.mast, sdv = TBL.screwdriver, mp = mast.getWorldPosition(P3()), sp = sdv.getWorldPosition(P3());
        const held = { mast: mast.parent !== HOUSE.group, sd: sdv.parent !== HOUSE.group, mp, sp };
        if (held.mast && t >= 36.2 && t <= 36.5) NA.mastSeat = Math.max(NA.mastSeat ?? 0, +(1000 * mp.distanceTo(P3().set(HOUSE.center.x + BOAT.mastRest.x, BOAT.mastRest.y + 0.005, HOUSE.center.z + BOAT.mastRest.z))).toFixed(1));
        if (heldPrev?.mast && !held.mast) NA.mastJump = +(1000 * mp.distanceTo(heldPrev.mp)).toFixed(1);
        if (heldPrev?.sd && !held.sd) NA.toolJump = +(1000 * sp.distanceTo(heldPrev.sp)).toFixed(1);
        heldPrev = held;
      } else heldPrev = null;
      // feet: everyone standing (not walking, kneeling or in a turn's step) has both soles on the ground
      for (const [id, a] of Object.entries(everyone)) {
        if (!a.rig.root.visible || !a.rig.root.parent || (id === 'zoe' && !a.present) || /^(walk|run|kneel)/.test(a.rig.anim) || (G.room ? Math.abs(a.pos.x - G.room.center.x) >= 30 : a.pos.x > 500)) continue;
        const f = CT.feet(a), m = Math.max(Math.abs(f[0]), Math.abs(f[1]));
        if (m > 0.09 && NA.feet.length < 8) NA.feet.push({ id, t: +t.toFixed(2), anim: a.rig.anim, cm: +(m * 100).toFixed(1) });
      }
    }
    if (!dark && G.room === G.rooms.house) {
      if (TURNS.some(([a, b]) => c.t >= a && c.t <= b)) {
        const h = K.handle.getWorldPosition(new v.constructor());
        let d = 9; for (const p of handPts()) d = Math.min(d, Math.hypot(Math.max(0, Math.hypot(p.x - h.x, p.z - h.z) - 0.075), Math.max(0, Math.abs(p.y - h.y) - 0.02)));
        if (d <= 0.02) hand.on++; else if (hand.off.length < 6) hand.off.push([+c.t.toFixed(2), +d.toFixed(3)]);
      }
      if (c.t >= WET[0] && c.t <= WET[1]) {
        const n = handPts().filter((p) => p.y < K.spout.y && p.y > K.basin.y && Math.hypot(p.x - K.spout.x, p.z - K.spout.z) < 0.03).length;
        if (n > 0 && K.stream.visible) hand.wet++; else if (hand.dry.length < 6) hand.dry.push(+c.t.toFixed(2));
      }
    }
    // standing feet (not walking or kneeling) don't jump while the picture is up
    for (const [id, a] of Object.entries(everyone)) {
      if (!a.rig.root.visible || (id === 'zoe' && !a.present)) { delete feetPrev[id]; continue; }
      const f = ['legL', 'legR'].map((s) => a.rig.j[s].foot.getWorldPosition(new v.constructor()));
      const p = feetPrev[id], still = !/^(walk|run|kneel)/.test(a.rig.anim);
      if (p && still && p.still && !dark && !p.dark) for (let i = 0; i < 2; i++) { const d = Math.hypot(f[i].x - p.f[i].x, f[i].z - p.f[i].z); if (d > 0.09 && d < 0.8 && footJumps.length < 8) footJumps.push({ id, t: +c.t.toFixed(2), d: +d.toFixed(3) }); }
      feetPrev[id] = { f, still, dark };
    }
    if (c.subI >= 0) { const sp = speakerOf[c.def.subs[c.subI].voice]; if (sp && (sp.rig.mOpen || 0) > 0.05) mouthBy[c.subI] = (mouthBy[c.subI] || 0) + 1; }
    for (const [id, a] of Object.entries(everyone)) if (a.rig.anim === 'talk' && talking.length < 6) talking.push({ id, t: +c.t.toFixed(2) });
    if (camPrev && c.t > 3.0 && c.t < 12.5) { const sp = cam.position.distanceTo(camPrev) * 30; if (sp < aerial.min) aerial.min = +sp.toFixed(2), aerial.at = +c.t.toFixed(2); }
    camPrev = cam.position.clone();
    if (cast.zoe.present && cast.zoe.rig.root.visible) {
      const fl = G.physics.groundAt(cast.zoe.pos.x, cast.zoe.pos.z), walking = cast.zoe.rig.anim === 'walk';
      for (const sd of ['L', 'R']) {
        const h = cast.zoe.rig.j['leg' + sd].foot.getWorldPosition(new v.constructor()).y - fl, f = zf[sd];
        if (f.h != null && walking) { if (h < f.h) f.down = true; else if (f.down) { f.down = false; if (f.hi - f.h > 0.05) footDown.push(f.t); f.hi = f.h; } f.hi = Math.max(f.hi, h); } else { f.hi = h; f.down = false; }
        f.h = h; f.t = +c.t.toFixed(3);
      }
    }
    const sub = document.querySelector('#cine-sub').classList.contains('show') ? document.querySelector('#cine-sub').textContent : '';
    if (sub && sub !== lastSub) subsAt.push(sub);
    lastSub = sub;
  }
  const subs = window.__cine.def.subs;
  G.audio.play = play0;
  const offbeat = stepsHeard.filter((s) => !footDown.some((d) => Math.abs(s - d) <= 0.1));
  return { NA, mouthBy: window.__cine.def.subs.map((s, i) => [s.voice, mouthBy[i] || 0]), talking, aerial, steps: { heard: stepsHeard.length, feet: footDown.length, offbeat: offbeat.slice(0, 8) }, mid, hand, footJumps, seen: [...seen].sort(), notPoly, pops, subsAt, solids, bumps, lines: subs.length, voiced: subs.map((s, i) => [s.voice, window.__cine.voiced[i] || 0]), ctx: G.audio.ctx?.state };
}, polySizes);
check('the scene moves to the house; still nothing saved mid-scene', watch.mid?.room === 'house' && !watch.mid.saved, watch.mid);
check('every character on screen is from the poly cast (assets/poly)', watch.notPoly.length === 0 && ['twinsen', 'zoe', 'arthur', 'worker'].every((n) => watch.seen.includes(n)), { notPoly: watch.notPoly, seen: watch.seen });
check('nobody vanishes or jumps on screen (only under a dip to black)', watch.pops.length === 0, watch.pops.slice(0, 6));
check('nobody walks through a solid (walls, furniture, fences, railings) while the picture is up', watch.solids.length === 0, watch.solids);
check('nobody walks through anybody else while the picture is up', watch.bumps.length === 0, watch.bumps);
check("R5: Zoé's hand is on the tap's handle every frame it turns (within 2 cm)", watch.hand.on >= 50 && watch.hand.off.length === 0, watch.hand);
check('R5: her fingers are in the stream under the spout', watch.hand.wet >= 45 && watch.hand.dry.length === 0, watch.hand);
check("R5: standing feet don't jump (more than 9 cm in a frame) while the picture is up", watch.footJumps.length === 0, watch.footJumps);
check('subtitles with the speaker, in order', watch.subsAt.length === watch.lines && watch.subsAt.some((x) => x.startsWith('Zoé') && x.includes("The tap's stopped again")) && watch.subsAt[0].startsWith('Resident'), watch.subsAt);
check("every spoken line babbles in its speaker's voice", watch.ctx === 'running' && watch.voiced.every(([vk, n]) => vk && n >= 2), watch.voiced);
check("OPEN-FILM: every line's speaker moves their mouth with it (the worker and the resident too)", watch.mouthBy.every(([vk, n]) => n >= 4), watch.mouthBy);
check('OPEN-FILM: no line plays the looping talk gesture (one gesture per line, or none)', watch.talking.length === 0, watch.talking);
check('OPEN-FILM: the aerial move does not stop between 3 and 12.5 s (it stopped dead at 9 s)', watch.aerial.min > 1.5, watch.aerial);
check("OPEN-FILM: every footstep heard is one of Zoé's feet coming down (within 0.1 s)", watch.steps.heard >= 10 && watch.steps.offbeat.length === 0, watch.steps);
{ const N = watch.NA, ok = (o, n) => o.n >= n && o.off.length === 0;
  check("NO-AIR: the worker's hand is on the lift's lever (within 3 cm) through both holds, and the lever is thrown under it", ok(N.lever, 120) && Math.abs(N.leverAt[15.2] - N.leverAt[13.6]) > 0.3 && Math.abs(N.leverAt[22] - N.leverAt[15.2]) > 0.3, { lever: N.lever, leverAt: N.leverAt });
  check('NO-AIR: both his hands are on the crate as it comes down to the deck (within 3 cm, never through it), and it comes down with them', ok(N.crate, 50) && N.through <= 0.02 && N.crateY.from - N.crateY.to > 0.2, { crate: N.crate, throughM: N.through, crateY: N.crateY });
  check("NO-AIR: the screwdriver's tip is in the lamp's screw (within 3 cm) while Twinsen mends it, and the screw turns in", ok(N.tool, 300) && Math.abs(N.screw[45.9][0] - N.screw[29.1][0]) > 3 && N.screw[29.1][1] - N.screw[45.9][1] > 3, { tool: N.tool, screw: N.screw });
  check("NO-AIR: Twinsen's other hand is on the lamp's shade", ok(N.shade, 150), N.shade);
  check("NO-AIR: Arthur's left hand is on his boat; his right, once the mast is in, on its deck", ok(N.hull, 250) && ok(N.deck, 200), { hull: N.hull, deck: N.deck });
  check('NO-AIR: the mast is home in its step in his hand before he lets go (within 5 mm), and does not move as he does (it jumped 64 cm)', N.mastSeat != null && N.mastSeat <= 5 && N.mastJump != null && N.mastJump <= 5, { seatMm: N.mastSeat, jumpMm: N.mastJump });
  check('NO-AIR: the screwdriver does not move as it is laid down (it jumped 11 cm)', N.toolJump != null && N.toolJump <= 10, { jumpMm: N.toolJump });
  check("NO-AIR: Zoé's palms are on the soil of the tray's pots (within 3 cm)", ok(N.pots, 200), N.pots);
  check('NO-AIR: standing feet are on the ground (no sole more than 9 cm off it)', N.feet.length === 0, N.feet);
}
await run(0.5);
const full = await endState();
check('played through: control in the house, objective, save, cast placed', good(full), full);
const kids0 = full.sceneKids;

// ---------------------------------------------------------------- 2. skipping
for (const at of [3, 21, 50, 64, 77, 85]) {
  await boot('new');
  await runTo(at);
  await holdSkip();
  const s = await endState();
  check(`skip at ${at}s ends in the same state`, good(s) && s.sceneKids === kids0, s);
}
// a short press does not skip
await boot('new');
await runTo(5);
await page.keyboard.down('KeyE'); await run(0.3); await page.keyboard.up('KeyE'); await run(0.5);
check('a short press does not skip', await ev(() => game.state === 'cinematic' && game.cine?.state === 'run'));

// ---------------------------------------------------------------- 3. pause / resume
await runTo(20);
await page.keyboard.press('Escape');
await run(0.1);
const p0 = await ev(() => ({ state: game.state, paused: game.cine?.paused, t: game.cine?.t, screen: !document.querySelector('#pause').classList.contains('hidden') }));
await run(2);
const p1 = await ev(() => game.cine?.t);
check('pause stops the scene clock and shows the pause menu', p0.state === 'pause' && p0.paused && p0.screen && Math.abs(p1 - p0.t) < 1e-6, { p0, p1 });
await page.click('#pause [data-act="resume"]');
await run(1);
const p2 = await ev(() => ({ state: game.state, paused: game.cine?.paused, t: game.cine?.t }));
check('resume continues the scene', p2.state === 'cinematic' && !p2.paused && p2.t > p1 + 0.5, p2);
// lost focus pauses too
await ev(() => window.dispatchEvent(new Event('blur')));
check('losing window focus pauses the scene', await ev(() => game.state === 'pause' && game.cine?.paused));
await page.click('#pause [data-act="resume"]');
await runTo(100); await run(0.5);
check('...and it still ends cleanly', good(await endState()));

// ---------------------------------------------------------------- 4. continue after the opening
await boot('continue', false);
await run(1.5);
const cont = await endState();
check('continue: no replay, in the house with the objective', cont.state === 'play' && !cont.cine && cont.room === 'house' && cont.objective.startsWith('Check the well') && cont.zoeOut && cont.arthur[0] === 'kneelWork', cont);

// ---------------------------------------------------------------- 5. new game again (from the title, with a save present)
await boot('new', false);
await holdSkip();
const again = await endState();
const dup = await ev(() => ({ zoes: game.npcs.filter((n) => n.def.id === 'zoe').length, lifts: (() => { let n = 0; game.world.root.traverse((o) => { if (o.name === 'cargoLift') n++; }); return n; })() }));
check('a second new game: same end state, nothing duplicated', good(again) && again.sceneKids === kids0 && dup.zoes === 1 && dup.lifts === 1, { again, dup });

// ---------------------------------------------------------------- 6. the first objective is playable
const blocked = await ev(() => {
  const G = game, e = G.room.exits.find((x) => x.to === 'outdoor');
  G.step(1.2); // (doors wait a moment after a room change)
  G.hero.pos.set(e.x, 0, e.z); G.step(0.5);
  const st = G.state;
  for (let i = 0; i < 40 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  return { st, room: G.room?.id, hint: !!G.flags.ballHint, obj: document.querySelector('#pause-objective').textContent };
});
check('without the ball the door holds him, with a hint', blocked.st === 'dialog' && blocked.room === 'house' && blocked.hint && blocked.obj.includes('cupboard'), blocked);
const took = await ev(() => {
  const G = game, s = G.room.searches.find((x) => x.id === 'cupboard');
  G.hero.pos.set(s.x + 0.3, 0, s.z); G.hero.angle = -Math.PI / 2; G.step(0.3);
  G.input.taps.add('KeyE'); G.step(0.1);
  for (let i = 0; i < 40 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  const e = G.room.exits.find((x) => x.to === 'outdoor');
  G.hero.pos.set(e.x, 0, e.z); G.step(2.0);
  return { ball: G.hero.hasBall, room: G.room?.id ?? 'outdoors', obj: document.querySelector('#pause-objective').textContent };
});
check('the cupboard gives the ball and the door lets him out', took.ball && took.room === 'outdoors' && took.obj.startsWith('Check the well'), took);

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
