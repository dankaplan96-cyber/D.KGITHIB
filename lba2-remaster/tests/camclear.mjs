// BUG-WALL: the play camera never stands inside the solid world after a target event, nor along the Whispering Cliffs
// (src/engine/camera.js _clearance / _keepOut; the user's 0.29.1 photo: after the target, the view inside the cliff).
//  (a) every ball-target event of chapters 1–10: the chapter set up by flags (ISO, as the chapter tests do), Twinsen
//      placed round the target, the ball thrown at it by input (Normal, F) until the event fires, then 6 s of what
//      follows (the stones rising, a tree falling, a dialogue). Every frame: the camera outside every enabled collider
//      (a house's or a tower's camSkip box: outside the scenery volume the camera reads instead, VP-10), and outdoors
//      at least 0.3 m above the terrain under it. At the end: Twinsen on screen, in view or drawn by the silhouette.
//      (Chapter 7 has no ball target: listed, nothing to throw at.)
//  (b) the Whispering Cliffs route, stones risen: Twinsen placed on a 4 m grid round the target, the stones and the
//      rock stack, 8 headings each, a fresh view then 1.3 s of the follow; on every stone's top facing up and down
//      the route; and walked by input across the plateau. Every frame as (a), and no drawn surface (the cliff rocks,
//      the stones, the pipeline, every opaque mesh there) within 0.15 m of the camera (the near plane is 0.1 m).
//  (c) scene changes: out of every Citadel door by input, the camera starts at its new shot (see below).
// SHOTS=<dir> keeps a screenshot after each event. ONLY=<case name substring> runs some of (a); PART=a|b|c one part.
// GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker();
const SHOTS = process.env.SHOTS, ONLY = process.env.ONLY, PART = process.env.PART;
const allErrs = [];

// page-side: the camera monitor, the throw at a target, the hero's visibility
async function install(page) {
  await page.evaluate(async () => {
    const THREE = await import('three');
    const G = game;
    window.T = {
      talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
      tp(x, z, a = 0, y = null) { const h = G.hero; h.pos.set(x, y == null ? G.physics.groundAt(x, z) : G.physics.groundAt(x, z, y + 1), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set?.(0, 0); G.camRig.lba.init = false; G.step(0.1); },
    };
    // is the camera inside something solid? (the reason, or '')
    window.__inside = (c) => {
      const P = G.physics, why = [], occ = G.room ? null : G.world.occ;
      if (G.room?.outdoor || !G.room) { const th = G.world.terrain.heightAt(c.x, c.z); if (c.y < th + 0.3) why.push('terrain ' + (th - c.y).toFixed(2)); }
      for (const k of P.near(c.x, c.z)) {
        if (!k.enabled || c.y >= k.top || c.y <= k.bottom || !P._inside(k, c.x, c.z, 0)) continue;
        if (k.camSkip && occ) continue;   // (its scenery volume below)
        why.push(k.type + '@' + k.x.toFixed(1) + ',' + k.z.toFixed(1) + ' top ' + k.top.toFixed(1) + (G.world.stones?.some((s) => s.c === k) ? ' (stone)' : ''));
      }
      if (occ) for (const v of occ.near(c.x, c.z)) { const t = occ.topAt(v, c.x, c.z); if (t > -Infinity && c.y >= v.y0 && c.y <= t) why.push('volume ' + v.kind + '@' + v.x.toFixed(1) + ',' + v.z.toFixed(1) + (v.camOnly ? ' (pipe)' : '')); }
      return why.join('; ');
    };
    // drawn surfaces near the camera (part b): the triangles of every opaque mesh in a box, built once
    window.__tris = null;
    window.__buildTris = (box) => {
      const tris = [], v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      G.scene.updateMatrixWorld(true);
      const moving = new Set((G.world.stones || []).map((s) => s.grp));
      G.scene.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry?.attributes?.position) return;
        for (let a = o; a; a = a.parent) if (a === G.hero.rig.root || a.visible === false || moving.has(a)) return;
        const m = [o.material].flat()[0]; if (!m || (m.transparent && m.opacity < 0.9) || m.colorWrite === false) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld), r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
        if (c.x + r < box.x0 || c.x - r > box.x1 || c.z + r < box.z0 || c.z - r > box.z1) return;
        const P = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : P.count;
        for (let i = 0; i < n; i += 3) {
          for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, I ? I.getX(i + k) : i + k).applyMatrix4(o.matrixWorld);
          const mx = Math.min(v[0].x, v[1].x, v[2].x), Mx = Math.max(v[0].x, v[1].x, v[2].x), mz = Math.min(v[0].z, v[1].z, v[2].z), Mz = Math.max(v[0].z, v[1].z, v[2].z);
          if (Mx < box.x0 || mx > box.x1 || Mz < box.z0 || mz > box.z1) continue;
          tris.push({ t: new THREE.Triangle(v[0].clone(), v[1].clone(), v[2].clone()), name: o.name || o.parent?.name || '?', mx, Mx, mz, Mz, my: Math.min(v[0].y, v[1].y, v[2].y), My: Math.max(v[0].y, v[1].y, v[2].y) });
        }
      });
      window.__tris = tris;
      return tris.length;
    };
    const q = new THREE.Vector3();
    window.__nearest = (p, R = 0.5) => { let best = 99, who = null; if (!__tris) return [best, who];
      for (const T2 of __tris) { if (p.x < T2.mx - R || p.x > T2.Mx + R || p.z < T2.mz - R || p.z > T2.Mz + R || p.y < T2.my - R || p.y > T2.My + R) continue;
        T2.t.closestPointToPoint(p, q); const d = q.distanceTo(p); if (d < best) { best = d; who = T2.name; } }
      return [best, who]; };
    // every camera update while on: the first frame inside something, the closest drawn surface
    window.__mon = { on: false, frames: 0, bad: null, nBad: 0, near: { d: 99 } };
    window.__monReset = () => Object.assign(__mon, { frames: 0, bad: null, nBad: 0, near: { d: 99 } });
    const rig = G.camRig, up = rig.update.bind(rig);
    rig.update = (...a) => {
      up(...a);
      const M = window.__mon; if (!M.on || rig.cine) return;
      const c = G.camera.position; M.frames++;
      const why = __inside(c);
      if (why) { M.nBad++; M.bad ??= { why, t: +G.time.toFixed(2), state: G.state, cam: [c.x, c.y, c.z].map((u) => +u.toFixed(2)), hero: [G.hero.pos.x, G.hero.pos.y, G.hero.pos.z].map((u) => +u.toFixed(2)), override: !!rig.override }; }
      if (__tris) { const [d, who] = __nearest(c); if (d < M.near.d) M.near = { d: +d.toFixed(3), who, cam: [c.x, c.y, c.z].map((u) => +u.toFixed(2)), hero: [G.hero.pos.x, G.hero.pos.y, G.hero.pos.z].map((u) => +u.toFixed(2)) }; }
    };
    // Twinsen seen: on screen (his middle inside the frame), and in view (nothing solid on the line to his head or
    // chest) or drawn by the silhouette pass (characters.js: it shows him wherever something is in front)
    window.__seen = () => {
      const h = G.hero, cam = G.camera; cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const s = new THREE.Vector3(h.pos.x, h.pos.y + 0.9, h.pos.z).project(cam);
      const onScreen = Math.abs(s.x) <= 1 && Math.abs(s.y) <= 1 && s.z < 1;
      const P = G.physics, occ = G.room ? null : G.world.occ, c = cam.position;
      const lineClear = (hy) => { const b = new THREE.Vector3(h.pos.x, h.pos.y + hy, h.pos.z), n = Math.ceil(c.distanceTo(b) / 0.25);
        for (let i = 1; i < n - 1; i++) { const p = c.clone().lerp(b, i / n);
          if ((G.room?.outdoor || !G.room) && G.world.terrain.heightAt(p.x, p.z) > p.y + 0.05) return false;
          for (const k of P.near(p.x, p.z)) if (k.enabled && !k.seeThrough && !k.camSkip && p.y < k.top && p.y > k.bottom && P._inside(k, p.x, p.z, 0)) return false;
          if (occ && occ.hit(p.x, p.y, p.z, new Set()) > -Infinity) return false; }
        return true; };
      const inView = lineClear(1.5) || lineClear(1.0);
      const sil = !!h.rig.silhouette && h.rig.silhouette.visible !== false;
      return { onScreen, inView, sil, ok: onScreen && (inView || sil), ndc: [+s.x.toFixed(2), +s.y.toFixed(2)] };
    };
    // the ball thrown at a target by input from spots round it until done() — then what follows, watched
    window.__throwAt = (tg, isDone, { r = 5, tries = 10, a0 = 0, follow = 6, spots = null } = {}) => {
      const h = G.hero, log = [];
      let k = 0;
      for (; k < tries && !isDone(); k++) {
        const a = spots ? spots[k % spots.length] : a0 + k * 0.63;
        const x = tg.x - Math.sin(a) * r, z = tg.z - Math.cos(a) * r;
        T.tp(x, z, Math.atan2(tg.x - x, tg.z - z));
        if (G.physics.blockedAt(h.pos.x, h.pos.z, h.pos.y, 0.3) || Math.abs(h.pos.y - tg.y) > 6) { log.push('spot ' + k + ' unusable'); continue; }
        G.step(1.0);   // (the view settles round him)
        __mon.on = true;
        if (h.behaviour !== 'normal') P.tap('F1');
        G.ball.state = 'idle'; h.hp = h.maxHp ?? 10;
        P.throwAt(tg.x, tg.z);
      }
      let how = isDone() ? 'input' : null;
      if (!how) { __mon.on = true; G.story.ballHit({ x: tg.x, y: tg.y, z: tg.z }) || tg.onHit?.() || (tg === G.world.target && G.hitTarget()); how = isDone() ? 'ISO hit (no throw landed)' : 'not fired'; }
      for (let t = 0; t < follow; t += 1 / 30) { G.step(1 / 30); if (G.state === 'dialog' && Math.round(t * 30) % 12 === 0) { G.input.taps.add('KeyE'); } }
      for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
      G.step(0.5);
      __mon.on = false;
      return { how, throws: k, log: log.slice(0, 4) };
    };
  });
}

async function boot() {
  const s = await launch({ width: 960, height: 540 });
  await open(s.page, '?nocine');
  await menu(s.page, 'new');
  await install(s.page);
  await s.page.evaluate(() => T.talkAll());
  return s;
}

// ------------------------------------------------------------------------------------------------- (a) target events
// [name, chapter setup (ISO), [target name, target getter, done getter]...]
const START = (flags) => `(() => { const G = game; T.talkAll(); Object.assign(G.flags, ${JSON.stringify(flags)}); G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll(); })()`;
const CASES = [
  { name: 'ch1 the well: a crystal node', setup: `(() => { const G = game; G.hero.hasBall = true; G.enterRoom('well', null, true); G.step(0.5); T.talkAll(); })()`,
    targets: [['node', `game.room.ballTargets.find((t) => !t.node.lit)`, `(tg) => tg.node.lit`]] },
  { name: 'ch2 Citadel: the Whispering Cliffs target', setup: START({ prologueDone: true, intro: true }) + `; game.flags.c1_task = true; if (game.room) game.exitRoom({ x: -60, z: -20 }, true); game.step(0.5)`,
    targets: [['the old target (the stones rise)', `game.world.target`, `(tg) => tg.hit`, { r: 7, spots: [0, 1, 2, 3, 4, 5].map((k) => (k - 2.5) * 0.4) }],
      ['the orchard valve (caged)', `game.world.valves.find((v) => v.kind === 'ball')`, `(tg) => tg.open`, { r: 7.5, spots: [-Math.PI / 2, -Math.PI / 2 + 0.2, -Math.PI / 2 - 0.2] }]] },
  { name: 'ch3 Zeelich: a mill brake', setup: START({ prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }) + `; game.flags.c2_plan = true; if (game.room?.id !== 'zeelich') game.enterRoom('zeelich', null, true); game.step(0.5); T.talkAll()`,
    targets: [['mill brake', `game.rooms.zeelich.mills[0].brake`, `() => game.flags['c2_mill_' + game.rooms.zeelich.mills[0].id]`]] },
  { name: 'ch4 the dig: a pump gear', setup: START({ prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true })
      + `; Object.assign(game.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true }); game.story.cur.toShell(); T.talkAll(); game.step(1.5); T.talkAll(); game.flags.c4_pumpTask = true`,
    targets: [['gear', `game.room.ballTargets.find((t) => t.gear != null && !t.done)`, `(tg) => tg.done`, { r: 3.5 }]] },
  { name: 'ch5 the condensers: the hatch switch', setup: START({ prologueDone: true, intro: true, chapter: 3, chapterKey: 'dig', c4_started: true, c4_done: true, c4_pump: true, c4_trust: true, c4_carving: true }) + `; game.enterRoom('condB', null, true); game.step(0.5); T.talkAll()`,
    targets: [['hatch switch', `game.rooms.condB.ballTargets.find((t) => t.hatch)`, `() => game.flags.c5_hatch`, { r: 3.5 }]] },
  { name: 'ch6 the Hamalayi: the dead tree, the kite', setup: START({ prologueDone: true, intro: true, chapter: 4, chapterKey: 'steam', c5_planned: true, c5_vent: true, c5_glider: true, c5_done: true }) + `; game.flags.c6_started = true; if (game.room?.id !== 'hamalayi') game.enterRoom('hamalayi', null, true); game.step(0.5); T.talkAll()`,
    targets: [['the dead tree (falls across the gorge)', `game.rooms.hamalayi.ballTargets.find((t) => t.tree)`, `() => game.flags.c6_bridge`, { r: 4 }],
      ['the kite', `(game.flags.c6_needFuse = true, game.flags.c6_kiteAsk = true, game.rooms.hamalayi.ballTargets.find((t) => t.kite))`, `() => game.flags.c6_kite`, { r: 4 }]] },
  { name: 'ch7 the observatory', none: true },
  { name: 'ch8 Citadel evacuated: the bunker hatch wheel', setup: START({ prologueDone: true, intro: true, chapter: 6, chapterKey: 'observatory', c1_water: true, c1_done: true, c7_started: true, c7_vent: true, c7_done: true }) + `; game.flags.c8_home = true; game.flags.c8_gilbert = true; if (game.room) { const w = game.story.cur.wheelSpot; game.exitRoom({ x: w.x - 4, z: w.z }, true); } game.step(0.5); T.talkAll()`,
    targets: [['hatch wheel', `game.story.cur.wheelSpot`, `() => game.flags.c8_depot`, { r: 4 }]] },
  { name: 'ch9 Zeelich, the council: a mill freed', setup: START({ prologueDone: true, intro: true, chapter: 7, chapterKey: 'evacuation', c1_water: true, c1_done: true, c2_shield: true, c2_mill_north: true, c8_started: true, c8_vesk: true, c8_done: true }) + `; game.flags.c9_form = true; game.flags.c9_okuAsk = true; if (game.room?.id !== 'zeelich') game.enterRoom('zeelich', null, true); game.step(0.5); T.talkAll()`,
    targets: [['mill brake', `game.rooms.zeelich.mills.find((m) => !game.flags['c9_free_' + m.id]).brake`, `() => game.rooms.zeelich.mills.some((m) => game.flags['c9_free_' + m.id])`]] },
  { name: 'ch10 the network: the north mill braked', setup: START({ prologueDone: true, intro: true, chapter: 8, chapterKey: 'council', c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
      c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_zoeDone: true, c9_started: true, c9_vote: true }) + `; game.flags.c10_okuAsk = true; if (game.room?.id !== 'zeelich') game.enterRoom('zeelich', null, true); game.step(0.5); T.talkAll()`,
    targets: [['north mill brake', `game.rooms.zeelich.mills[0].brake`, `() => game.flags.c10_millBraked`]] },
];

if (!PART || PART === 'a') for (const C of CASES) {
  if (ONLY && !C.name.includes(ONLY)) continue;
  if (C.none) { console.log(`---- ${C.name}: no ball target in this chapter (story ballTargets() is empty)`); continue; }
  console.log('---- ' + C.name);
  const { browser, page, errs } = await boot();
  try {
    const st = await page.evaluate(`${C.setup}; ({ key: game.flags.chapterKey, room: game.room?.id ?? 'citadel', state: game.state })`);
    console.log('  setup (ISO):', JSON.stringify(st));
    for (const [tname, getT, getDone, opts] of C.targets) {
      const r = await page.evaluate(`(() => { const tg = ${getT}; if (!tg) return { missing: true }; const isDone = ${getDone}; __monReset();
        const res = __throwAt(tg, () => isDone(tg), ${JSON.stringify(opts || {})}); const seen = __seen();
        return { ...res, fired: !!isDone(tg), frames: __mon.frames, nBad: __mon.nBad, bad: __mon.bad, seen, room: game.room?.id ?? 'citadel', state: game.state }; })()`);
      console.log('  ' + tname + ':', JSON.stringify(r).slice(0, 700));
      check(`${C.name} — ${tname}: the event fires`, r.fired, r);
      check(`${C.name} — ${tname}: camera never inside a collider, a scenery volume or the terrain (${r.frames} frames)`, !r.missing && r.frames > 0 && r.nBad === 0, r.bad);
      check(`${C.name} — ${tname}: Twinsen on screen and seen afterwards`, r.seen?.ok, r.seen);
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, (C.name.split(' ')[0] + '-' + tname).replace(/[^a-z0-9]+/gi, '_') + '.jpg'), type: 'jpeg', quality: 78, timeout: 240000 }); }
    }
  } catch (e) { check(`${C.name}: ran`, false, e.message.split('\n')[0]); }
  allErrs.push(...errs);
  await browser.close();
}

// ------------------------------------------------------------------------------------------------- (b) the cliffs
if ((!PART || PART === 'b') && !ONLY) {
  console.log('---- the Whispering Cliffs route (generic probe)');
  const { browser, page, errs } = await boot();
  const r0 = await page.evaluate(() => {
    const G = game; Object.assign(G.flags, { prologueDone: true, intro: true }); G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
    if (G.room) G.exitRoom({ x: -60, z: -20 }, true);
    G.step(0.5);
    const n = __buildTris({ x0: -92, x1: -36, z0: -64, z1: -6 });
    // the target by input (segment 04's spots), the stones rising watched
    __monReset();
    const T0 = G.world.target, res = __throwAt(T0, () => T0.hit, { r: 7, spots: [0, 1, 2, 3, 4, 5].map((k) => (k - 2.5) * 0.4) });
    return { tris: n, ...res, hit: T0.hit, frames: __mon.frames, nBad: __mon.nBad, bad: __mon.bad, near: __mon.near, seen: __seen() };
  });
  console.log('  the target by input:', JSON.stringify(r0).slice(0, 700));
  check('cliffs: the target hit by input, the stones risen', r0.hit, r0);
  check(`cliffs: the stones rising, camera never inside anything (${r0.frames} frames)`, r0.nBad === 0, r0.bad);
  check('cliffs: the stones rising, no surface within 0.15 m of the camera', r0.near.d >= 0.15, r0.near);
  // placements round the target, the stones and the rock stack
  const r1 = await page.evaluate(() => {
    const G = game, h = G.hero, out = { n: 0, bad: [], near: [], unseen: [] };
    const settle = () => { __monReset(); __mon.on = true; G.camRig.lba.init = false; for (let f = 0; f < 40; f++) G.step(1 / 30); __mon.on = false; };
    const one = (x, z, a, y = null) => {
      T.tp(x, z, a, y); settle(); out.n++;
      if (__mon.nBad) out.bad.push({ x, z, a: +a.toFixed(2), ...__mon.bad });
      if (__mon.near.d < 0.15) out.near.push({ x, z, a: +a.toFixed(2), ...__mon.near });
      const s = __seen(); if (!s.ok) out.unseen.push({ x, z, a: +a.toFixed(2), ...s });
    };
    for (let x = -82; x <= -46; x += 4) for (let z = -54; z <= -14; z += 4) {
      const gy = G.physics.groundAt(x, z);
      if (gy < 0.5 || G.physics.blockedAt(x, z, gy, 0.3) || G.world.terrain.slopeAt(x, z) > 0.9) continue;
      for (let k = 0; k < 8; k++) one(x, z, k * Math.PI / 4);
    }
    const S = G.world.stones;
    for (let i = 0; i < S.length; i++) {
      const s = S[i].c, nx = S[Math.min(S.length - 1, i + 1)].c, pv = S[Math.max(0, i - 1)].c;
      one(s.x, s.z, Math.atan2(nx.x - s.x, nx.z - s.z) || 0, s.top);
      one(s.x, s.z, Math.atan2(pv.x - s.x, pv.z - s.z) || Math.PI, s.top);
    }
    return out;
  });
  console.log('  placements:', r1.n, 'inside:', r1.bad.length, 'near a surface:', r1.near.length, 'not seen:', r1.unseen.length);
  for (const b of [...r1.bad, ...r1.near, ...r1.unseen].slice(0, 12)) console.log('   ', JSON.stringify(b).slice(0, 300));
  check(`cliffs: ${r1.n} placements (grid ×8 headings, every stone both ways), camera never inside anything`, r1.n > 300 && r1.bad.length === 0, r1.bad.slice(0, 3));
  check('cliffs: placements, no surface within 0.15 m of the camera', r1.near.length === 0, r1.near.slice(0, 3));
  check('cliffs: placements, Twinsen on screen and seen', r1.unseen.length === 0, r1.unseen.slice(0, 3));
  // across the plateau by input, from the top stone to the shard pedestal, round the standing stones, to the valve
  const r2 = await page.evaluate(() => {
    const G = game, S = G.world.stones, top = S[S.length - 1].c, P0 = G.world.shard1Spot;
    T.tp(top.x, top.z, Math.atan2(P0.x - top.x, P0.z - top.z), top.top); G.step(1);
    __monReset(); __mon.on = true;
    const way = [[P0.x - 3, P0.z + 4], [P0.x + 4, P0.z + 2], [P0.x + 3, P0.z - 4], [P0.x - 4, P0.z - 3], [P0.x - 5, P0.z + 3]];
    const v = G.world.valves.find((q) => q.id === 'cliff');
    const got = way.map(([x, z]) => { P.go(x, z, { tol: 0.8, maxT: 30 }); return P.state().pos; });
    P.go(v.x - 1.2, v.z + 0.4, { tol: 0.8, maxT: 30 });
    __mon.on = false;
    return { got, end: P.state().pos, frames: __mon.frames, nBad: __mon.nBad, bad: __mon.bad, near: __mon.near, seen: __seen() };
  });
  console.log('  the plateau by input:', JSON.stringify(r2).slice(0, 600));
  check(`cliffs: walking the plateau by input, camera never inside anything (${r2.frames} frames)`, r2.frames > 100 && r2.nBad === 0, r2.bad);
  check('cliffs: walking the plateau, no surface within 0.15 m of the camera', r2.near.d >= 0.15, r2.near);
  check('cliffs: walking the plateau, Twinsen seen at the end', r2.seen.ok, r2.seen);
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, 'cliffs-plateau.jpg'), type: 'jpeg', quality: 78, timeout: 240000 }); }
  allErrs.push(...errs);
  await browser.close();
}
// ------------------------------------------------------------------------------------------------- (c) scene changes
// The user (0.31.0): "when I leave the house, the camera runs across the water". The rooms stand ~1 km east of
// Citadel, out over the sea: a camera smoothed from where it was would cross it. Every Citadel door: in (placed on
// the door, ISO), out by input (walk into the exit); from the first frame after the switch (the screen still black,
// then clearing) the camera must start at its shot: within 20 m of Twinsen, within 3 m of where it stands 1 s on,
// and never more than 0.6 m in one frame. In the remaster follow every door; the 1997 cuts and the free orbit on two.
if ((!PART || PART === 'c') && !ONLY) {
  console.log('---- scene changes: out of every Citadel door');
  const { browser, page, errs } = await boot();
  const r = await page.evaluate(() => {
    const G = game, h = G.hero; Object.assign(G.flags, { prologueDone: true, intro: true }); h.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
    const out = [];
    const leave = () => { if (!G.room) return; const e = G.room.exits.find((x) => !x.room && x.to !== undefined) || G.room.exits[0]; P.through(e.x, e.z); };
    leave();
    // (every door any chapter opens on Citadel, once per room: the current chapter's, the town's, the others')
    const seenRoom = new Set(), doors = [...G.story.doors(), ...G.story.townDoors(), ...G.story.chapters.flatMap((c) => { try { return c.doors(); } catch { return []; } })]
      .filter((d) => (d.region || 'citadel') === 'citadel' && G.rooms[d.room] && !G.rooms[d.room].outdoor && !seenRoom.has(d.room) && seenRoom.add(d.room));
    const rec = [], rig = G.camRig, up = rig.update.bind(rig);
    let on = false;
    rig.update = (...q) => { up(...q); if (on) { const c = G.camera.position; rec.push({ out: !G.room, trans: !!G.trans, c: c.clone(), h: h.pos.clone() }); } };
    const modes = [['remaster', () => { G.settings.camera = 'lba'; rig.setMode('lba'); rig.cut = false; }], ['1997 cuts', () => { rig.setMode('lba'); rig.cut = true; }], ['free orbit', () => { rig.setMode('free'); rig.cut = false; }]];
    for (const [i, d] of doors.entries()) for (const [mode, set] of modes) {
      if (mode !== 'remaster' && i > 1) continue;
      set(); leave();
      T.tp(d.x, d.z + 1.5); G.step(0.6); T.tp(d.x, d.z); for (let k = 0; k < 40 && (G.trans || !G.room); k++) G.step(0.1); T.talkAll(); G.step(1);
      if (G.room?.id !== d.room) { out.push({ door: d.room, mode, skip: 'not entered (' + (G.room?.id ?? 'citadel') + '): its door is shut in this chapter' }); continue; }
      rec.length = 0; on = true;
      const e = G.room.exits.find((x) => !x.room) || G.room.exits[0];
      P.through(e.x, e.z); G.step(1.5);
      on = false;
      const i0 = rec.findIndex((f) => f.out);
      if (i0 < 0) { out.push({ door: d.room, mode, fail: 'did not get out' }); continue; }
      const after = rec.slice(i0), f0 = after[0], f1 = after[Math.min(after.length - 1, 60)];
      let step = 0; for (let k = 1; k < after.length; k++) step = Math.max(step, after[k].c.distanceTo(after[k - 1].c));
      const toHero = Math.hypot(f0.c.x - f0.h.x, f0.c.z - f0.h.z), toLater = f0.c.distanceTo(f1.c);
      out.push({ door: d.room, mode, toHero: +toHero.toFixed(1), toLater: +toLater.toFixed(2), maxStep: +step.toFixed(2), black: f0.trans, ok: toHero <= 20 && toLater <= 3 && step <= 0.6 });
    }
    rig.setMode('lba'); rig.cut = false;
    return out;
  });
  for (const x of r) console.log('   ', JSON.stringify(x));
  const rm = r.filter((x) => x.mode === 'remaster' && !x.skip);
  check(`scene changes: ${rm.length} Citadel doors left by input (remaster follow), the camera starts at its shot`, rm.length >= 4 && rm.every((x) => x.ok), rm.filter((x) => !x.ok));
  check('scene changes: the 1997 cuts and the free orbit too (two doors each)', r.filter((x) => x.mode !== 'remaster').length >= 4 && r.filter((x) => x.mode !== 'remaster').every((x) => x.ok), r.filter((x) => x.mode !== 'remaster' && !x.ok));
  allErrs.push(...errs);
  await browser.close();
}
process.exit(done(allErrs) ? 1 : 0);
