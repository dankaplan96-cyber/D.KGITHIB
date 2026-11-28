// P93 DEPOT: chapter 2's project depot on Zeelich, where Twinsen takes the code cylinder from the locker (the brief, 21.11;
// docs/lba-maturity/DEPOT.md). Automated runtime only (headless Chromium, SwiftShader, game.step): no real display, no
// real hardware, no human player. Each scenario says how it was driven:
//   INPUT   Twinsen moved by keys only (Classic: arrows, F4 Discreet, F throws, E uses), the watch on its own AI;
//   STAGED  the test set something up first (put him or the watch somewhere, reset the watch, emptied his magic):
//           what follows is still played by keys and the game's own AI.
// Scenarios:
//   A  the gate, the masts and the doors: colliders where something is drawn (ball probes), throws through the gateway
//      that bounce only off drawn things; the loose leaf is there and shut
//   B  the clue: a gust swings the leaf open (seen: its angle) and it bangs shut (heard: 'clunk' at the doors); the guard
//      on his round turns to it, waits and goes back to work; the drones and the dog do not; nothing on the HUD
//   C  the trick: the ball against the doors from the gateway: the same swing; the guard walks over, looks, goes back;
//      only him
//   D  the opening: after the throw, Discreet to the locker, the cylinder, and out by the gate unseen; the same walk
//      without the throw, from the same starts, for comparison (reported); the ordinary route stays open
//   E  a missed throw: nothing knocks, nobody goes
//   F  repeated hits: a hit while he looks is ignored; after two checks only a glance; a minute later he checks again
//   G  detected: the watch's own pursuit, the progress kept
//   H  no magic: a throw without magic (a dud: it comes back at its first touch) still knocks the leaf from within its
//      reach; the locker needs no magic
//   I  30 and 60 FPS (Settings' frame rate and the step): the leaf's swing, the guard's check, and the throw's release
//      (where the ball leaves against where the hand is) agree
//   J  the cylinder saved: Save → Continue after it: kept, once, the locker empty, the depot as it was
// Run: GAME_URL=http://localhost:<port>/ node tests/depot.mjs   (ONLY=ABCDEFGHIJ; SHOTS=dir for pictures; TRIALS=n for D)
// The start is tests/fixtures/campaign/base-05.save.json (chapter 2's arrival, a save from before P93), its origin
// rewritten to GAME_URL's.
import { launch, open, menu, checker, URL0 } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, checkVisual, done } = checker({ info: 'always' });
const ONLY = (process.env.ONLY || 'ABCDEFGHIJ').toUpperCase();
const SHOTS = process.env.SHOTS || null;
const TRIALS = +(process.env.TRIALS || 8);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const fixture = fs.readFileSync(path.join(HERE, 'fixtures/campaign/base-05.save.json'), 'utf8').replaceAll('http://localhost:9201', new URL(URL0).origin);
const LOAD = path.join(os.tmpdir(), `depot-${process.pid}.save.json`);
fs.writeFileSync(LOAD, fixture);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const t0 = Date.now();
const log = (s, o) => console.log(`[${((Date.now() - t0) / 1000) | 0}s] ${s}`, o === undefined ? '' : JSON.stringify(o));

const { browser, context, page } = await launch({ storageState: LOAD });
await open(page, '?nocine');
await menu(page, 'continue');
const shot = async (name) => { if (!SHOTS) return; await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

// ---- the page's helpers (window.DQ). Everything Twinsen does goes through keys (P.* of tests/lib/player.js or the keys
// below); `stage*` are the STAGED parts and say so
const helpers = () => {
  const G = window.game, I = G.input, PH = G.physics, ox = 2400, Y0 = 6.0, DT = 1 / 30;
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const Z = () => G.rooms.zeelich, D = () => Z().depot, door = () => D().door;
  const watch = () => G.enemies.filter((e) => e.def?.group === 'zdepot');
  const guard = () => watch().find((e) => e.def.id === 'zguard1');
  const CALM = new Set(['patrol', 'guard', 'home', 'search']);
  const hostile = () => watch().filter((e) => e.alive && e.present && !CALM.has(e.state)).map((e) => e.id + ':' + e.state);
  const W = (x, z) => ({ x: x + ox, z });
  window.DQ = {
    dt: DT,
    W, door, guard, watch, hostile,
    // what each member is doing (for the log)
    states() { return watch().map((e) => `${e.id}:${e.state}${e.inv ? (e.inv.walk ? '/check' : '/look') : ''}@${(e.pos.x - ox).toFixed(1)},${e.pos.z.toFixed(1)}`); },
    // STAGED: the watch back at its start (each where chapter2.js enemyDefs puts it, on its round, unhurt), the leaf shut,
    // the guard's memory of knocks cleared, the ball home, Twinsen unhurt with his magic
    stageReset() {
      const defs = G.story.cur.enemyDefs();
      for (const e of watch()) {
        const d = defs.find((x) => x.id === e.def.id);
        e.pos.set(d.x, PH.groundAt(d.x, d.z), d.z); e.wp = d.wp; e.hp = e.maxHp; e.kb?.set(0, 0); e.inv = null; e.waitT = 0; e.stateT = 0; e.coolT = 0;
        e.state = e.def.kind === 'gdog' ? 'guard' : 'patrol'; e.angle = d.angle ?? 0; e.recentHitT = 0; e.last = null; e.aimLine && (e.aimLine.visible = false);
        if (e.hover != null && e.baseHover) e.hover = e.baseHover;
        e.setPresent(true); e.sync?.(); e.syncHover?.();
      }
      G.combatDir?.reset?.(); G.resetCombat?.(); G.bolts?.list?.splice(0).forEach((b) => G.scene.remove(b.m));
      const S = door(); S.angle = 0; S.w = 0; S.leaf.parent.rotation.y = 0;
      const E = G.story.cur.depotEar; if (E) Object.assign(E, { checks: 0, lastHit: -1e9, coolUntil: -1e9, wasCheck: false });
      const h = G.hero; h.hp = h.maxHp; h.mp = h.mpMax; G.ball.reset?.('drop');
      I.keys.clear();
    },
    // STAGED: Twinsen put at (x, z) local, facing (fx, fz), in a behaviour
    stageHero(x, z, fx, fz, beh = 'discreet') {
      const h = G.hero; h.pos.set(x + ox, PH.groundAt(x + ox, z), z); h.angle = Math.atan2(fx - x, fz - z); h.vel?.set(0, 0); h.vy = 0; h.onGround = true; h.reanchor = true;
      h.setBehaviour(beh); G.camRig.snap?.(); I.keys.clear(); G.step(0.1, DT);
    },
    // INPUT: pick a behaviour by its key (F1 Normal … F4 Discreet), as a player does
    beh(b) { const k = { normal: 'F1', athletic: 'F2', aggressive: 'F3', discreet: 'F4' }[b]; if (G.hero.behaviour !== b) P.tap(k); },
    // INPUT: turn on the spot (Classic: Left/Right) to face a local point; then throw (F)
    // (then finer, in short presses, to within ~1°: a player lining up a throw at 12 m)
    face(x, z) {
      P.face(x + ox, z); const h = G.hero;
      for (let i = 0; i < 60; i++) {
        const d = norm(Math.atan2(x + ox - h.pos.x, z - h.pos.z) - h.angle); if (Math.abs(d) < 0.015) break;
        I.keys.add(d > 0 ? 'ArrowLeft' : 'ArrowRight'); G.step(1 / 240, 1 / 240); I.keys.delete('ArrowLeft'); I.keys.delete('ArrowRight'); G.step(1 / 60, 1 / 60);
      }
    },
    throwBall() { I.keys.add('KeyF'); I.taps.add('KeyF'); G.step(1 / 60, DT); I.keys.delete('KeyF'); },
    // would anyone of the watch see Twinsen at (x, z) if he were there now (their own look; vis: his visibility, here scaled
    // for a margin)? The bot reads the watch the way a player watching them does
    risk(x, z, vis) {
      const H = { pos: new (G.hero.pos.constructor)(x, G.hero.pos.y, z), dead: false, visibility: () => vis };
      for (const e of watch()) {
        if (!e.alive || !e.present) continue;
        if (e.def.kind === 'gdog' ? e.notices(H, true) : e.sees(H, true)) return e.id;
        if (Math.hypot(e.pos.x - x, e.pos.z - z) < 1.6) return e.id;   // (nor walk into one)
      }
      return null;
    },
    // where each of the watch will be over the next seconds, from its round as a player who has watched it knows it:
    // [{x, z, a}] every 0.25 s for T s (its waits at the corners counted; the guard's check followed to its end)
    foresee(e, T) {
      const out = [], SP = e.def.kind === 'drone' ? 1.6 : e.def.kind === 'gdog' ? 1.5 : 1.4, WAIT = e.def.kind === 'drone' ? 0.8 : e.def.kind === 'gdog' ? 1.5 : 1.2;
      let x = e.pos.x, z = e.pos.z, a = e.angle, wp = e.wp % e.patrol.length, hold = Math.max(0, e.waitT || 0), t = 0;
      const I = e.inv; let inv = I ? { stand: I.walk && !I.at ? I.stand : null, look: Math.max(0, I.look - I.t), to: I.to, walk: I.walk } : null;
      if (!e.alive || !e.present) return out;
      const CALMS = ['patrol', 'guard', 'home', 'search'];
      if (!CALMS.includes(e.state)) { for (; t <= T; t += 0.25) out.push({ x, z, a, hot: true }); return out; }
      for (; t <= T; t += 0.25) {
        out.push({ x, z, a });
        let left = 0.25;
        while (left > 1e-6) {
          if (inv) {
            if (inv.stand) { const dx = inv.stand.x - x, dz = inv.stand.z - z, d = Math.hypot(dx, dz); if (d < 0.4) inv.stand = null; else { const s = Math.min(d, SP * left); x += dx / d * s; z += dz / d * s; a = Math.atan2(dx, dz); left -= s / SP; continue; } }
            a = Math.atan2(inv.to.x - x, inv.to.z - z);
            const s = Math.min(left, inv.look); inv.look -= s; left -= s;
            if (inv.look <= 1e-6) { if (inv.walk) { let b = 0, bd = 1e9; e.patrol.forEach(([px, pz], i) => { const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; b = i; } }); wp = b; } inv = null; hold = 0.5; }
            continue;
          }
          if (hold > 0) { const s = Math.min(hold, left); hold -= s; left -= s; continue; }
          const [tx, tz] = e.patrol[wp], dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz);
          if (d < 0.4) { wp = (wp + 1) % e.patrol.length; hold = WAIT; continue; }
          const s = Math.min(d, SP * left); x += dx / d * s; z += dz / d * s; a = Math.atan2(dx, dz); left -= s / SP;
        }
      }
      return out;
    },
    // would a walk along pts (local [x, z], at Discreet's 0.67 m/s, then waiting `stay` s at its end) be seen by anyone, as
    // foreseen? (their own ranges and cones with a margin; close by always)
    safeWalk(pts, stay = 2) {
      const P0 = pts.map(([x, z]) => ({ x: x + ox, z })), legs = [];
      let T = 0; for (let i = 1; i < P0.length; i++) { const d = Math.hypot(P0[i].x - P0[i - 1].x, P0[i].z - P0[i - 1].z); legs.push({ a: P0[i - 1], b: P0[i], t0: T, t1: T + d / 0.62 }); T += d / 0.62; }
      const heroAt = (t) => { for (const L of legs) if (t <= L.t1) { const k = (t - L.t0) / Math.max(1e-6, L.t1 - L.t0); return { x: L.a.x + (L.b.x - L.a.x) * k, z: L.a.z + (L.b.z - L.a.z) * k, moving: true }; } const e = P0[P0.length - 1]; return { x: e.x, z: e.z, moving: false }; };
      for (const e of watch()) {
        const F = DQ.foresee(e, T + stay), R = e.def.kind === 'drone' ? 9 : e.def.kind === 'gdog' ? 11 : 10, C = e.def.kind === 'drone' ? 0.75 : e.def.kind === 'gdog' ? 1.4 : 0.85;
        for (let i = 0; i < F.length; i++) {
          const f = F[i], hp = heroAt(i * 0.25), v = hp.moving ? 0.4 : 0.25, d = Math.hypot(hp.x - f.x, hp.z - f.z);
          if (f.hot || d < 1.6 + 0.6 * 1 || (d < R * v * 1 + 0.4 * 1 && Math.abs(norm(Math.atan2(hp.x - f.x, hp.z - f.z) - f.a)) < C + 0.25 * 1)) return { seenBy: e.id, at: +(i * 0.25).toFixed(2) };
        }
      }
      return null;
    },
    // INPUT: one leg in Discreet along a planned way (keys only), stopping if someone of the watch goes for him
    walkLeg(x, z, maxT = 60) {
      const h = G.hero; DQ.beh('discreet');
      const tx = x + ox; let plan = P.plan(tx, z, { tol: 0.35 }), wi = 1, t = 0; const keys = I.keys;
      while (t < maxT) {
        if (hostile().length) { P.release(); return { r: 'seen', by: hostile(), t: +t.toFixed(1) }; }
        if (Math.hypot(h.pos.x - tx, h.pos.z - z) < 0.5) { P.release(); return { r: 'arrived', t: +t.toFixed(1) }; }
        while (wi < plan.pts.length - 1 && Math.hypot(plan.pts[wi].x - h.pos.x, plan.pts[wi].z - h.pos.z) < 0.45) wi++;
        const w = plan.pts[Math.min(wi, plan.pts.length - 1)] || { x: tx, z };
        const diff = norm(Math.atan2(w.x - h.pos.x, w.z - h.pos.z) - h.angle);
        keys.delete('ArrowLeft'); keys.delete('ArrowRight'); keys.delete('ArrowUp');
        if (diff > 0.1) keys.add('ArrowLeft'); else if (diff < -0.1) keys.add('ArrowRight');
        if (Math.abs(diff) < 0.35) keys.add('ArrowUp');
        G.step(DT, DT); t += DT;
      }
      P.release(); return { r: 'timeout', t };
    },
    // INPUT: from where he waits, leg by leg through the yard: before each leg he waits (standing, in Discreet) until the
    // watch's rounds leave it clear for the walk and a moment at its end. Waiting points: the gate outside, the middle of
    // the yard (inside their round), the locker. Ends 'arrived' | 'seen' | 'gave up'
    cross(route, { maxWait = 90 } = {}) {
      const h = G.hero, log = []; let waited = 0;
      for (let i = 0; i < route.length; i++) {
        const [x, z] = route[i], from = [h.pos.x - ox, h.pos.z];
        let w = 0;
        // (turn toward the leg first, standing: tank controls turn slowly)
        DQ.face(x, z);
        while (DQ.safeWalk([from, [x, z]], i === route.length - 1 ? 1 : 2.5) && w < maxWait) { if (hostile().length) return { r: 'seen', by: hostile(), leg: i, log, waited }; G.step(0.25, DT); w += 0.25; }
        waited += w;
        if (w >= maxWait) return { r: 'gave up', leg: i, log, waited };
        const r = DQ.walkLeg(x, z);
        log.push([i, +w.toFixed(1), r.r, r.t]);
        if (r.r !== 'arrived') return { r: r.r, by: r.by, leg: i, log, waited };
      }
      return { r: 'arrived', log, waited: +waited.toFixed(1) };
    },
    // INPUT: E at the locker when its prompt is up (he is beside it)
    takeCylinder() {
      for (let i = 0; i < 60 && P.target()?.kind !== 'c2locker'; i++) { P.face(D().locker.x, D().locker.z + 1); G.step(0.05, DT); }
      if (P.target()?.kind !== 'c2locker') return { r: 'no prompt', target: P.target() };
      P.tap('KeyE', 0.1);
      for (let k = 0; k < 150 && (G.hero.actT > 0 || G.hero.steer) && G.state === 'play'; k++) G.step(DT, DT);
      const s = P.settle(); for (let i = 0; i < 20 && G.state !== 'play'; i++) { P.tap('KeyE', 0.1); P.settle(); }
      return { r: 'used', lines: s.lines, cyl: !!G.flags.c2_cyl };
    },
    // wait (game time) until f() or maxT; returns the time waited
    until(f, maxT, dt = DT) { let t = 0; while (t < maxT && !f()) { G.step(dt, dt); t += dt; } return +t.toFixed(2); },
    // the soft target the ball would take along his facing now (null: the ball goes where he faces)
    softTarget() { const h = G.hero, tg = G.targeting.throwTarget({ x: Math.sin(h.angle), z: Math.cos(h.angle) }); return tg ? (tg.id || tg.def?.id || 'point') : null; },
  };
};
await page.evaluate(helpers);
const routes = () => { window.IN = [[11.0, 10.0], [9.2, 12.4], [9.2, 21.4], [15.2, 23.5]]; window.OUT = [[9.2, 21.4], [9.2, 12.4], [11.0, 10.0], [10.6, 7.4]]; };
await page.evaluate(routes);

log('start', await page.evaluate(() => ({ room: game.room?.id, chapter: game.flags.chapterKey, plan: !!game.flags.c2_plan, version: game.flags.saveVersion ?? null })));
// Baldino first (INPUT, as tests/playthrough/06-zeelich.mjs): the locker is offered from then on
log('Baldino (input)', await page.evaluate(() => {
  P.settle(); const Z = game.rooms.zeelich, d = Z.workshopDoor;
  P.through(d.x, d.z, { run: true }); P.talk('baldino');
  const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z);
  return { plan: !!game.flags.c2_plan, room: game.room?.id };
}));
check('setup: Baldino by input; the locker is offered (c2_plan)', await page.evaluate(() => !!game.flags.c2_plan && game.room?.id === 'zeelich'));
// spy on what the HUD and the sound do (watches only)
await page.evaluate(() => {
  const G = game; window.SPY = { sounds: [], toasts: [], floats: [] };
  const a0 = G.audio.play.bind(G.audio); G.audio.play = (n, at, o) => { SPY.sounds.push({ n, t: +G.time.toFixed(2), x: at?.x, z: at?.z }); return a0(n, at, o); };
  const t0 = G.hud.toast.bind(G.hud); G.hud.toast = (k, ...r) => { SPY.toasts.push({ k, t: +G.time.toFixed(2) }); return t0(k, ...r); };
  const f0 = G.hud.float?.bind(G.hud); if (f0) G.hud.float = (s, ...r) => { SPY.floats.push({ s, t: +G.time.toFixed(2) }); return f0(s, ...r); };
});

// ---------------------------------------------------------------- A. the gate, the masts, the doors
if (ONLY.includes('A')) {
  const r = await page.evaluate(async () => {
    const THREE = await import('three');
    const G = game, PH = G.physics, ox = 2400, Y0 = 6.0, S = DQ.door();
    const near = (x, z, r) => PH.colliders.filter((c) => c.enabled && Math.hypot(c.x - (ox + x), c.z - z) < r);
    const pillars = near(12, 9, 2.2).filter((c) => c.type === 'box' && c.hw === 0.3 && c.hd === 0.3).map((c) => +(c.top - Y0).toFixed(2));
    const beam = near(12, 9, 1).filter((c) => c.type === 'box' && c.hw > 2 && c.bottom > Y0 + 3).map((c) => [+(c.bottom - Y0).toFixed(2), +(c.top - Y0).toFixed(2)]);
    const masts = [[23.4, 9.6], [4.6, 24.6]].map(([x, z]) => near(x, z, 0.05).map((c) => ({ r: c.r, noBall: !!c.noBall, top: +(c.top - Y0).toFixed(1) })));
    // ball-sized probes beside each mast's pole at 1.0–3.0 m: solid for the ball only within the pole's reach
    const mastProbe = [[23.4, 9.6, -1, 0], [4.6, 24.6, 0, -1]].map(([x, z, ux, uz]) => [0.2, 0.3, 0.45, 0.55].map((d) => PH.solidAt(ox + x + ux * d, z + uz * d, Y0 + 1.5, 0.14)));
    // throws through the gateway (Normal, Athletic, Discreet), each wall contact checked against what is drawn there:
    // a mesh within 0.4 m of the ball's centre (rays out in 14 directions)
    const meshes = []; G.rooms.zeelich.group.traverse((o) => { if (o.isMesh || o.isInstancedMesh) meshes.push(o); });
    const ray = new THREE.Raycaster(), dirs = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; for (const y of [0, -0.7, 0.7]) dirs.push(new THREE.Vector3(Math.sin(a), y, Math.cos(a)).normalize()); }
    dirs.push(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
    const drawnNear = (p, r = 0.4) => dirs.some((d) => { ray.set(p, d); ray.near = 0; ray.far = r; return ray.intersectObjects(meshes, false).length > 0; });
    for (const e of DQ.watch()) e.setPresent(false);   // (STAGED: the watch away: the throws are for the walls)
    const out = [], B = G.ball;
    const b0 = B.bounce.bind(B); let contacts = [];
    B.bounce = (kind, at) => { if (kind === 'wall') contacts.push({ p: B.pos.clone(), c: B.solidCollider?.() }); return b0(kind, at); };
    const spots = [[10.6, 8.3, 21.7, 12.6], [12, 7.4, 12, 16], [11, 7.6, 18, 16], [13, 7.6, 6, 16], [13.2, 9.8, 23.4, 9.8], [12.4, 9.4, 22, 14], [12, 10.5, 14.2, 8.0], [12, 10.5, 9.8, 8.0]];
    for (const beh of ['normal', 'athletic', 'discreet']) for (const [x, z, fx, fz] of spots) {
      DQ.stageHero(x, z, fx, fz, beh); G.hero.mp = G.hero.mpMax;
      contacts = []; DQ.throwBall(); DQ.until(() => B.state === 'idle', 5);
      for (const c of contacts) out.push({ beh, from: [x, z], at: [+(c.p.x - ox).toFixed(2), +c.p.y.toFixed(2), +c.p.z.toFixed(2)], drawn: drawnNear(c.p) });
    }
    B.bounce = b0;
    for (const e of DQ.watch()) e.setPresent(true);
    return { pillars, beam, masts, mastProbe, door: { at: [+(S.x - ox).toFixed(2), +S.z.toFixed(2)], angle: S.angle, stand: [+(S.stand.x - ox).toFixed(2), +S.stand.z.toFixed(2)], drawn: S.leaf.visible && (S.leaf.layers.mask & G.camera.layers.mask) !== 0, verts: S.leaf.geometry.attributes.position.count }, contacts: out.length, undrawn: out.filter((c) => !c.drawn) };
  });
  log('A geometry', r);
  check('A1 STAGED probe: the gate pillars stop the ball up to their caps (Y0+3.55, were 3.0), the hazard beam over the gate has a collider (3.05–3.35, had none)', r.pillars.length === 2 && r.pillars.every((t) => t >= 3.5) && r.beam.length === 1 && r.beam[0][0] >= 3.0 && r.beam[0][1] <= 3.4, { pillars: r.pillars, beam: r.beam });
  check('A2 STAGED probe: each floodlight mast stops the ball at its pole (r 0.16), not 0.4 m out; its foot still keeps people off (r 0.4, not for the ball)', r.masts.every((m) => m.some((c) => c.r === 0.16 && !c.noBall) && m.some((c) => c.r === 0.4 && c.noBall)) && r.mastProbe.every((p) => p[0] && !p[2] && !p[3]), { masts: r.masts, probe: r.mastProbe });
  checkVisual('A3b the loose leaf is drawn by the play camera (a moving part: not taken into the merged batches, which hid it)', r.door.drawn && r.door.verts > 0, r.door);
  check('A3 the loose leaf is on the red container, shut, with a place to look at it from', !!r.door && r.door.angle === 0 && Math.abs(r.door.at[0] - 21.7) < 0.1 && Math.abs(r.door.at[1] - 12.6) < 0.1, r.door);
  check('A4 INPUT throws (Classic F) through the gateway, 24 (8 spots × Normal, Athletic, Discreet), watch away: every wall bounce is against something drawn within 0.4 m of the ball centre (no invisible collider)', r.contacts > 0 && r.undrawn.length === 0, { contacts: r.contacts, undrawn: r.undrawn.slice(0, 6) });
}

// ---------------------------------------------------------------- B. the clue: a gust, the guard turns, waits, goes back
if (ONLY.includes('B')) {
  const r = await page.evaluate(() => {
    const G = game, S = DQ.door(), ox = 2400, g0 = DQ.guard();
    DQ.stageReset();
    // STAGED: he stands outside the north fence, west of the gate, in Discreet (out of their reach), and waits as a player
    // watching the yard would
    DQ.stageHero(7.5, 6.0, 15, 15, 'discreet');
    SPY.sounds.length = 0; SPY.toasts.length = 0; SPY.floats.length = 0;
    const res = { gusts: [], hostile: [] };
    let k0 = S.knocks;
    const others0 = DQ.watch().filter((e) => e !== g0).map((e) => e.state);
    for (let n = 0; n < 8 && res.gusts.length < 6; n++) {
      // the next gust
      const w = DQ.until(() => S.knocks !== k0, 40); k0 = S.knocks;
      if (DQ.hostile().length) { res.hostile.push(DQ.hostile()); break; }
      const gd = Math.hypot(g0.pos.x - S.x, g0.pos.z - S.z), looked = !!g0.inv && !g0.inv.walk;
      // the swing, the guard's turn and the way back to work, frame by frame
      let peak = 0, facedAt = null, invEnd = null, t = 0, moved = 0, p0 = null, othersTurned = 0;
      const tgt = Math.atan2(S.x - g0.pos.x, S.z - g0.pos.z);
      const others = DQ.watch().filter((e) => e !== g0), oa = others.map((e) => e.state);
      while (t < 6) {
        G.step(DQ.dt, DQ.dt); t += DQ.dt; peak = Math.max(peak, S.angle);
        if (looked && facedAt == null && Math.abs(Math.atan2(Math.sin(g0.angle - tgt), Math.cos(g0.angle - tgt))) < 0.35) facedAt = +t.toFixed(2);
        if (looked && invEnd == null && !g0.inv) { invEnd = +t.toFixed(2); p0 = g0.pos.clone(); }
        if (p0) moved = Math.max(moved, Math.hypot(g0.pos.x - p0.x, g0.pos.z - p0.z));
        others.forEach((e, i) => { if (e.state !== oa[i] && !['patrol', 'guard'].includes(e.state)) othersTurned++; });
      }
      const clunk = SPY.sounds.filter((s) => s.n === 'clunk' && Math.hypot(s.x - S.x, s.z - S.z) < 0.5).length; SPY.sounds.length = 0;
      res.gusts.push({ waited: w, gd: +gd.toFixed(1), looked, peak: +peak.toFixed(2), facedAt, invEnd, movedAfter: +moved.toFixed(2), clunk, othersTurned, guard: g0.state });
    }
    res.toasts = SPY.toasts.slice(); res.floats = SPY.floats.slice(); res.state = G.state;
    res.others0 = others0; res.othersNow = DQ.watch().filter((e) => e !== g0).map((e) => e.state);
    return res;
  });
  log('B gusts', r);
  const near = r.gusts.filter((g) => g.gd < 14), far = r.gusts.filter((g) => g.gd >= 14);
  check('B1 the gusts come on their own (6 within ~2 min of waiting) and each swings the leaf visibly open (≥ 0.4 rad, ~23°) — the clue with the sound off', r.gusts.length >= 4 && r.gusts.every((g) => g.peak >= 0.4), r.gusts.map((g) => [g.waited, g.peak]));
  check('B2 each swing bangs shut audibly at the doors (\'clunk\' placed there)', r.gusts.every((g) => g.clunk >= 1), r.gusts.map((g) => g.clunk));
  check('B3 the guard on his round within 14 m turns to the leaf (within 1.2 s), waits, and goes back to work (his look ends ≤ 2.5 s, he walks on)', near.length >= 1 && near.every((g) => g.looked && g.facedAt != null && g.facedAt <= 1.2 && g.invEnd != null && g.invEnd <= 2.5 && g.movedAfter > 0.3), near);
  check('B4 a guard further off than 14 m takes no notice; the drones and the dog never react; nobody is alerted while he waits outside in Discreet', far.every((g) => !g.looked) && r.gusts.every((g) => g.othersTurned === 0) && r.hostile.length === 0, { far, hostile: r.hostile });
  check('B5 nothing extra: no toast, no "!" over anyone, no dialogue', r.toasts.length === 0 && r.floats.length === 0 && r.state === 'play', { toasts: r.toasts, floats: r.floats, state: r.state });
}

// ---------------------------------------------------------------- C. the trick: the ball against the doors
// (INPUT from a STAGED start: he stands just outside the gate's west post in Discreet, waits until the guard is on his
//  round and no one of the watch is in the ball's way, faces the doors through the gateway and throws)
const throwAtDoor = () => {
  const G = game, S = DQ.door(), ox = 2400, g0 = DQ.guard(), B = G.ball;
  const k0 = S.knocks;
  DQ.face(22.3, 12.6);
  // (a player waits for a moment when nobody of the watch is in the ball's way to the doors, now or in the next 1.5 s)
  const clear = () => { const h = G.hero; for (const e of DQ.watch()) for (const f of DQ.foresee(e, 1.5)) { const ax = S.x - h.pos.x, az = S.z - h.pos.z, L = Math.hypot(ax, az), k = Math.max(0, Math.min(1, ((f.x - h.pos.x) * ax + (f.z - h.pos.z) * az) / (L * L))); if (Math.hypot(h.pos.x + ax * k - f.x, h.pos.z + az * k - f.z) < 1.4) return false; } return true; };
  const waited = DQ.until(() => g0.state === 'patrol' && !g0.inv && DQ.softTarget() === null && !DQ.hostile().length && B.state === 'idle' && clear(), 60);
  DQ.face(22.3, 12.6);
  const before = DQ.states(), soft = DQ.softTarget(), hero = [+(G.hero.pos.x - ox).toFixed(2), +G.hero.pos.z.toFixed(2), +G.hero.angle.toFixed(2)];
  DQ.throwBall();
  const path = []; let t = 0;
  while (t < 4 && !(S.knocks !== k0 || B.state === 'return' || B.state === 'idle')) { G.step(DQ.dt, DQ.dt); t += DQ.dt; if (B.state === 'fly' && path.length < 60) path.push([+(B.pos.x - ox).toFixed(1), +B.pos.y.toFixed(1), +B.pos.z.toFixed(1)]); }
  return { waited, knocked: S.knocks !== k0, check: !!g0.inv?.walk, look: !!g0.inv && !g0.inv.walk, soft, hero, before, contacts: (B.contacts || []).map((c) => c.kind + (c.c ? '@' + (c.c.x - ox).toFixed(1) + ',' + c.c.z.toFixed(1) : '')), path: path.filter((_, i) => i % 3 === 0), ball: B.state };
};
await page.evaluate((f) => { window.throwAtDoor = eval(f); }, `(${throwAtDoor.toString()})`);
if (ONLY.includes('C')) {
  const r = await page.evaluate((TRACE) => {
    const process = { env: { TRACE } };
    const G = game, S = DQ.door(), ox = 2400, g0 = DQ.guard();
    DQ.stageReset(); DQ.stageHero(10.6, 8.3, 21.7, 12.6, 'discreet');
    G.step(3, DQ.dt);
    const others = DQ.watch().filter((e) => e !== g0);
    const wp0 = others.map((e) => e.wp);
    SPY.sounds.length = 0; SPY.toasts.length = 0; SPY.floats.length = 0;
    let peak = 0;
    const th = throwAtDoor();
    // follow the check: to his place, the look, back to his round
    let t = 0, atStand = null, lookEnd = null, faced = 0, minD = 99, backWp = null;
    const stand = S.stand;
    const trace = []; let lastS = '';
    while (t < 40 && (g0.inv || t < 0.5)) {
      G.step(DQ.dt, DQ.dt); t += DQ.dt; peak = Math.max(peak, S.angle);
      if (process.env.TRACE !== undefined) { const st = DQ.states().map((x) => x.split('@')[0]).join(' '); if (st !== lastS) { trace.push(t.toFixed(1) + ' ' + st + ' beh ' + G.hero.behaviour + ' vis ' + G.hero.visibility().toFixed(2)); lastS = st; } }
      const d = Math.hypot(g0.pos.x - stand.x, g0.pos.z - stand.z); minD = Math.min(minD, d);
      if (atStand == null && g0.inv?.at) atStand = +t.toFixed(2);
      if (g0.inv?.at) { const a = Math.atan2(S.x - g0.pos.x, S.z - g0.pos.z); if (Math.abs(Math.atan2(Math.sin(g0.angle - a), Math.cos(g0.angle - a))) < 0.4) faced++; }
    }
    lookEnd = +t.toFixed(2); backWp = g0.wp;
    const wpPos = g0.patrol[backWp];
    const nearestWp = g0.patrol.reduce((b, p, i) => (Math.hypot(p[0] - g0.pos.x, p[1] - g0.pos.z) < Math.hypot(g0.patrol[b][0] - g0.pos.x, g0.patrol[b][1] - g0.pos.z) ? i : b), 0);
    G.step(3, DQ.dt);
    const othersCalm = others.every((e) => ['patrol', 'guard'].includes(e.state));
    const clunk = SPY.sounds.filter((s) => s.n === 'clunk').length;
    return { trace, th, peak: +peak.toFixed(2), atStand, lookEnd, lookFrames: faced, minD: +minD.toFixed(2), backWp, nearestWp, guard: g0.state, othersCalm, others: DQ.states(), clunk, toasts: SPY.toasts.length, floats: SPY.floats.length, hostile: DQ.hostile() };
  }, process.env.TRACE);
  log('C the ball', r);
  check('C1 INPUT: the ball thrown through the gateway at the doors knocks the leaf: the same swing (≥ 0.4 rad) and bang as a gust', r.th.knocked && r.peak >= 0.4 && r.clunk >= 1, { th: r.th, peak: r.peak, clunk: r.clunk });
  check('C2 the guard leaves his round to check: walks to the doors (within 0.5 m of his spot), faces them while he looks (≥ 3.5 s), then takes up his round at its nearest point', r.th.check && r.atStand != null && r.minD < 0.5 && r.lookFrames * (1 / 30) >= 3.5 && r.backWp === r.nearestWp && r.guard === 'patrol', r);
  check('C3 only him: the drones and the dog keep their rounds; no "!", no toast; nobody alerted', r.othersCalm && r.floats === 0 && r.toasts === 0 && r.hostile.length === 0, { others: r.others, floats: r.floats, toasts: r.toasts, hostile: r.hostile });
}

// ---------------------------------------------------------------- D. the opening (and the ordinary route)
if (ONLY.includes('D')) {
  const trial = async (withThrow, wait) => page.evaluate(({ withThrow, wait }) => {
    const G = game, S = DQ.door(), ox = 2400, g0 = DQ.guard();
    DQ.stageReset(); DQ.stageHero(10.6, 8.3, 21.7, 12.6, 'discreet');
    G.step(wait, DQ.dt);   // (a start further into the watch's rounds)
    let th = null;
    if (withThrow) th = throwAtDoor();
    const go = DQ.cross(IN);
    return { withThrow, wait, th: th && { knocked: th.knocked, check: th.check, waited: th.waited }, go, states: go.r === 'arrived' ? null : DQ.states() };
  }, { withThrow, wait });
  const waits = [0, 7, 14, 21, 28, 35, 42, 49].slice(0, Math.max(1, TRIALS));
  const rows = [];
  for (const w of waits) for (const wt of [true, false]) { const r = await trial(wt, w); rows.push(r); log(`D trial (${wt ? 'throw' : 'no throw'}, start +${w}s)`, r); }
  const ok = (wt) => rows.filter((r) => r.withThrow === wt && r.go.r === 'arrived').length;
  const n = waits.length;
  log('D summary', { withThrow: `${ok(true)}/${n}`, without: `${ok(false)}/${n}` });
  check(`D1 INPUT (STAGED starts; a bot that waits for gaps in the rounds it has watched): with the guard sent to the doors, Discreet to the locker unseen in most starts (${ok(true)}/${n}) and at least as often as without the throw (${ok(false)}/${n})`, ok(true) >= Math.ceil(n / 2) && ok(true) >= ok(false), rows.map((r) => [r.withThrow ? 'T' : '-', r.wait, r.go.r, r.go.t, r.go.by || '']));
  // the whole of it once, by input: the throw, Discreet to the locker, the cylinder, back out of the gate unseen
  const full = await page.evaluate(() => {
    const G = game, ox = 2400, tries = [];
    for (const wait of [0, 10, 20, 30, 40, 50]) {
      DQ.stageReset(); DQ.stageHero(10.6, 8.3, 21.7, 12.6, 'discreet'); G.step(wait, DQ.dt);
      const th = throwAtDoor();
      const inn = DQ.cross(IN);
      const row = { wait, th: { knocked: th.knocked, check: th.check }, inn: inn.r + (inn.by ? ' ' + inn.by : '') };
      tries.push(row);
      if (inn.r !== 'arrived') continue;
      if (!G.flags.c2_cyl) row.take = DQ.takeCylinder();
      const out = DQ.cross(OUT);
      row.out = out.r + (out.by ? ' ' + out.by : '');
      if (out.r === 'arrived' && G.flags.c2_cyl) break;
    }
    const took = tries.find((r) => r.take?.cyl), outOk = tries.find((r) => r.out === 'arrived' && tries.indexOf(r) >= tries.indexOf(took));
    return { tries, took: !!took, out: !!outOk, cyl: !!G.flags.c2_cyl, planBack: !!G.flags.c2_planBack };
  });
  log('D full', full);
  check('D2 INPUT: the throw, Discreet to the locker, E: the code cylinder (the plan back with it); back out of the gate unseen', full.took && full.out && full.cyl && full.planBack, full);
  if (SHOTS) await shot('D-out-with-cylinder');
}

// ---------------------------------------------------------------- E. a missed throw
if (ONLY.includes('E')) {
  const r = await page.evaluate(() => {
    const G = game, S = DQ.door(), g0 = DQ.guard(), B = G.ball;
    DQ.stageReset(); DQ.stageHero(10.6, 8.3, 8, 16, 'discreet'); G.step(1, DQ.dt);
    const k0 = S.knocks, waited = DQ.until(() => DQ.softTarget() === null && g0.state === 'patrol' && !g0.inv, 60);
    DQ.throwBall(); DQ.until(() => B.state === 'idle', 5);
    const knocked = S.knocks !== k0, inv = !!g0.inv?.walk;
    return { waited, knocked, check: inv, contacts: (B.contacts || []).map((c) => c.kind), guard: g0.state, hostile: DQ.hostile() };
  });
  log('E missed throw', r);
  check('E1 INPUT: a throw into the yard away from the doors (it bounces and comes back): the leaf is not knocked, the guard does not go to check', !r.knocked && !r.check && r.contacts.length > 0, r);
}

// ---------------------------------------------------------------- F. repeated hits
if (ONLY.includes('F')) {
  const r = await page.evaluate(() => {
    const G = game, S = DQ.door(), g0 = DQ.guard(), B = G.ball, E = () => G.story.cur.depotEar;
    // (STAGED: the guard alone, the drones and the dog put away: this is about him)
    DQ.stageReset(); for (const e of DQ.watch()) if (e !== g0) e.setPresent(false);
    DQ.stageHero(10.6, 8.3, 21.7, 12.6, 'discreet'); G.step(2, DQ.dt);
    const out = [];
    // (STAGED hits: the ball's own hit call at the doors, as a throw makes it each step of its flight — this is about his
    //  memory, not the aim: the aim is C1 by input)
    const one = (label) => { const k0 = S.knocks; B.contacts = []; G.story.cur.ballHit(new (G.hero.pos.constructor)(S.x - 0.3, S.y, S.z - 0.35)); out.push({ label, knocked: S.knocks !== k0, check: !!g0.inv?.walk, look: !!g0.inv && !g0.inv.walk, checks: E().checks }); };
    one('1st hit');                                     // a check
    G.step(1.0, DQ.dt); one('during his check');       // ignored: he is already going
    const back1 = DQ.until(() => !g0.inv, 40);
    one('just after (cool-down)');                      // only a glance
    DQ.until(() => !g0.inv, 10); G.step(6.5, DQ.dt);
    one('2nd check');                                   // a check again (2)
    DQ.until(() => !g0.inv, 40); G.step(6.5, DQ.dt);
    one('3rd (bored)');                                 // only a glance
    DQ.until(() => !g0.inv, 10); G.step(3, DQ.dt);
    one('4th (bored)');
    DQ.until(() => !g0.inv, 10);
    const quiet = DQ.until(() => false, 61);            // a minute without a knock
    one('after a quiet minute');                        // a check again
    DQ.until(() => !g0.inv, 40);
    for (const e of DQ.watch()) e.setPresent(true);
    return { out, back1, quiet, hostile: DQ.hostile() };
  });
  log('F repeated hits', r);
  const o = Object.fromEntries(r.out.map((x) => [x.label, x]));
  check('F1 STAGED hits: the 1st hit sends him to check; a hit while he is on his way changes nothing (no second check counted)', o['1st hit'].check && o['1st hit'].checks === 1 && o['during his check'].knocked && o['during his check'].checks === 1, r.out.slice(0, 2));
  check('F2 a hit just after his check: only a glance (cool-down); after it, a 2nd check', !o['just after (cool-down)'].check && o['just after (cool-down)'].look && o['2nd check'].check && o['2nd check'].checks === 2, r.out.slice(2, 4));
  check('F3 bored after two checks: the 3rd and 4th hits get only a glance (he does not leave his round)', ['3rd (bored)', '4th (bored)'].every((k) => o[k].knocked && !o[k].check && o[k].look), r.out.slice(4, 6));
  check('F4 a quiet minute later he checks again', o['after a quiet minute'].check && o['after a quiet minute'].checks === 1, o['after a quiet minute']);
}

// ---------------------------------------------------------------- G. detected
if (ONLY.includes('G')) {
  const r = await page.evaluate(() => {
    const G = game, S = DQ.door(), g0 = DQ.guard(), f = G.flags;
    DQ.stageReset(); DQ.stageHero(10.6, 8.3, 21.7, 12.6, 'discreet'); G.step(2, DQ.dt);
    const th = throwAtDoor();
    const before = { plan: !!f.c2_plan, cyl: !!f.c2_cyl, planTaken: !!f.c2_planTaken, chapter: f.chapterKey, hp: G.hero.hp };
    // INPUT: Normal, and straight at the guard at the doors
    DQ.beh('normal');
    const g = P.go(g0.pos.x - 2.5, g0.pos.z - 1.0, { tol: 0.8, fight: false, maxT: 30, stopWhen: () => DQ.hostile().length > 0 });
    const seen = DQ.hostile();
    G.step(2, DQ.dt);
    const after = { plan: !!f.c2_plan, cyl: !!f.c2_cyl, planTaken: !!f.c2_planTaken, chapter: f.chapterKey };
    return { th: { knocked: th.knocked, check: th.check }, g, seen, guardInv: !!g0.inv, guard: g0.state, states: DQ.states(), before, after, room: G.room?.id, state: G.state };
  });
  log('G detected', r);
  check('G1 INPUT: after a throw at the doors, walking up to the guard in Normal: he sees him and the watch\'s own pursuit starts (alerted / chase / aim), his check over', r.seen.length > 0 && !r.guardInv && r.guard !== 'patrol', r);
  check('G2 progress kept: the same flags, the same chapter, still in the depot (no reset, no teleport)', JSON.stringify({ ...r.before, hp: undefined }) === JSON.stringify({ ...r.after, hp: undefined }) && r.room === 'zeelich', { before: r.before, after: r.after });
  // let the fight go (STAGED: the watch back on its round, Twinsen healed) so the scenarios after are as before
  await page.evaluate(() => { DQ.stageReset(); });
}

// ---------------------------------------------------------------- H. no magic
if (ONLY.includes('H')) {
  const r = await page.evaluate(() => {
    const G = game, S = DQ.door(), g0 = DQ.guard(), B = G.ball, ox = 2400;
    // STAGED: no magic; he stands in the yard 4 m from the doors (a dud comes back at its first touch, ~5–7 m out), the
    // guard alone on his round (the drones and the dog put away for this one)
    DQ.stageReset(); for (const e of DQ.watch()) if (e !== g0) e.setPresent(false);
    DQ.stageHero(18.8, 10.0, 22.3, 12.6, "discreet"); G.step(1, DQ.dt);
    G.hero.mp = 0; SPY.sounds.length = 0;
    const k0 = S.knocks; DQ.face(22.3, 12.6);
    DQ.until(() => g0.state === 'patrol' && !g0.inv && DQ.softTarget() === null, 40);
    DQ.face(22.3, 12.6); DQ.throwBall(); DQ.until(() => B.state === 'idle', 5);
    const dud = SPY.sounds.some((s) => s.n === 'throwDud'), knocked = S.knocks !== k0, check = !!g0.inv?.walk;
    DQ.until(() => !g0.inv, 40);
    for (const e of DQ.watch()) e.setPresent(true);
    // the locker with no magic (STAGED beside it, the watch away): its prompt and the cylinder
    let locker = null;
    if (!G.flags.c2_cyl) { for (const e of DQ.watch()) e.setPresent(false); DQ.stageHero(15.2, 22.6, 15.2, 25, 'discreet'); G.hero.mp = 0; locker = DQ.takeCylinder(); for (const e of DQ.watch()) e.setPresent(true); }
    return { dud, magic: B.magic, knocked, check, mp: G.hero.mp, contacts: (B.contacts || []).map((c) => c.kind), locker, cyl: !!G.flags.c2_cyl };
  });
  log('H no magic', r);
  check('H1 INPUT with no magic (STAGED mp 0, 4 m off): the dud throw (no bounces) still knocks the leaf and the guard goes to check', r.dud && r.magic === false && r.knocked && r.check, r);
  check('H2 the locker needs no magic: E with mp 0 takes the cylinder (or it was taken by input in D)', r.cyl && (r.locker === null || r.locker.cyl), r.locker);
}

// ---------------------------------------------------------------- I. 30 and 60 FPS
if (ONLY.includes('I')) {
  const r = await page.evaluate(() => {
    const G = game, S = DQ.door(), g0 = DQ.guard(), B = G.ball, ox = 2400, out = {};
    const hand = () => { const j = G.hero.rig.j.armR.hand, v = new (G.hero.pos.constructor)(); j.updateWorldMatrix(true, false); j.getWorldPosition(v); return v; };
    for (const fps of [60, 30]) {
      const dt = 1 / fps; G.settings.fps = String(fps); G.applySettings?.();
      // the leaf's swing from one knock
      const E = G.story.cur.depotEar, g0T = E.gustT; E.gustT = 1e9;   // (no gust in the middle of it)
      S.angle = 0; S.w = 0; let peak = 0, shutAt = null, t = 0; const c0 = S.onClack; S.onClack = (v) => { if (shutAt == null) shutAt = +t.toFixed(3); c0?.(v); };
      S.knock(2.4);
      while (t < 3) { G.step(dt, dt); t += dt; peak = Math.max(peak, S.angle); }
      S.onClack = c0; E.gustT = g0T;
      // the guard's check from the same STAGED place: to his spot, the look, back
      DQ.stageReset();
      for (const e of DQ.watch()) if (e !== g0) e.setPresent(false);
      g0.pos.set(ox + 18.6, G.physics.groundAt(ox + 18.6, 12.8), 12.8); g0.wp = 3; g0.angle = 0; g0.sync();
      DQ.stageHero(7.5, 6.0, 15, 15, 'discreet');
      g0.investigate(S, { walk: true, stand: S.stand, look: 4.0 });
      let tt = 0, at = null; while (tt < 30 && g0.inv) { G.step(dt, dt); tt += dt; if (at == null && g0.inv?.at) at = +tt.toFixed(3); }
      for (const e of DQ.watch()) e.setPresent(true);
      // the throw's release in the gateway (INPUT: F): where the ball leaves against where the hand is at the release
      DQ.stageReset(); for (const e of DQ.watch()) e.setPresent(false);
      DQ.stageHero(10.6, 8.3, 21.7, 12.6, 'normal'); G.step(0.5, dt);
      let rel = null; const h = G.hero; const st0 = B.step.bind(B);
      B.step = (d) => { const rs = !!B.reseat; st0(d); if (rs && !rel) { const H = hand(), f = Math.sin(h.angle), c = Math.cos(h.angle), o = B.relOff; rel = { origin: [+o.f.toFixed(3), +o.u.toFixed(3), +o.s.toFixed(3)], handNow: [+((H.x - h.pos.x) * f + (H.z - h.pos.z) * c).toFixed(3), +(H.y - h.pos.y).toFixed(3)], pose: +h.rig.actionT.toFixed(3), flown: +B.life.toFixed(3) }; } };
      G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); G.step(dt, dt); G.input.keys.delete('KeyF');
      DQ.until(() => B.state === 'idle', 5, dt);
      B.step = st0;
      for (const e of DQ.watch()) e.setPresent(true);
      out[fps] = { peak: +peak.toFixed(3), shutAt, check: { atStand: at, total: +tt.toFixed(3) }, rel };
    }
    G.settings.fps = 'auto'; G.applySettings?.();
    return out;
  });
  log('I 30/60', r);
  const a = r[60], b = r[30];
  check('I1 the leaf\'s swing the same at 30 and 60 FPS (peak within 0.02 rad, it bangs shut within one 30 FPS frame of the 60 FPS time)', Math.abs(a.peak - b.peak) < 0.02 && Math.abs(a.shutAt - b.shutAt) <= 1 / 30 + 1e-3, { 60: [a.peak, a.shutAt], 30: [b.peak, b.shutAt] });
  check('I2 the guard\'s check the same at 30 and 60 FPS (at his spot and back to his round within 0.15 s)', Math.abs(a.check.atStand - b.check.atStand) < 0.15 && Math.abs(a.check.total - b.check.total) < 0.15, { 60: a.check, 30: b.check });
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  check('I3 INPUT: the ball leaves from the same place at 30 and 60 FPS (within 0.15 m; before P93 0.37 m apart, from a hand 0.4 m lower at 30) and high in front (≥ 1.3 m up, 0.6–1.1 m ahead)', a.rel && b.rel && d(a.rel.origin, b.rel.origin) < 0.15 && [a, b].every((x) => x.rel.origin[1] >= 1.3 && x.rel.origin[0] >= 0.6 && x.rel.origin[0] <= 1.1), { 60: a.rel, 30: b.rel, apart: a.rel && b.rel && +d(a.rel.origin, b.rel.origin).toFixed(3) });
  if (process.env.FPS) { /* the settings' own frame-rate line is covered by tests/fps30.mjs */ }
}

// ---------------------------------------------------------------- J. the cylinder saved: Save → Continue
if (ONLY.includes('J')) {
  const pre = await page.evaluate(() => {
    const G = game, f = G.flags;
    if (!f.c2_cyl) {   // (D did not run: take it now, STAGED by the locker with the watch away)
      for (const e of DQ.watch()) e.setPresent(false);
      DQ.stageHero(15.2, 22.6, 15.2, 25, 'discreet'); DQ.takeCylinder();
      for (const e of DQ.watch()) e.setPresent(true);
    }
    const inv = (G.hero.items || G.inventory?.items || null);
    return { cyl: !!f.c2_cyl, items: JSON.stringify(G.hero.inv || G.hero.items || {}).slice(0, 200) };
  });
  // Esc → Save & quit, then Continue, as a player
  const saved = await page.evaluate(() => { const raw = localStorage.getItem('lba3_save_v1'); try { const s = JSON.parse(raw); return { cyl: !!s.flags.c2_cyl, depotKeys: Object.keys(s.flags).filter((k) => /depotEar|gust|knock|loose|leaf/i.test(k)), room: s.room ?? null }; } catch { return null; } });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
  await page.evaluate(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: path.join(HERE, 'lib/player.js') });
  await menu(page, 'continue');
  await page.evaluate(helpers); await page.evaluate(routes);
  const r = await page.evaluate(() => {
    const G = game, f = G.flags, S = DQ.door();
    P.settle();
    let lockerOffered = false;
    G.story.cur.interactables((d, r, o) => { if (o.kind === 'c2locker') lockerOffered = true; }, () => 0);
    const k0 = S.knocks; G.step(30, DQ.dt);
    return { room: G.room?.id, cyl: !!f.c2_cyl, chapter: f.chapterKey, lockerOffered, objective: G.story.cur.objective(), door: { angle: S.angle, knocksIn30s: S.knocks - k0 }, watch: DQ.states().length };
  });
  log('J save → continue', { pre, saved, r });
  check('J1 after the cylinder the game saved it (the save holds c2_cyl; no new P93 field in the save)', pre.cyl && saved?.cyl && saved.depotKeys.length === 0, { pre, saved });
  check('J2 Continue: the cylinder is kept, the locker no longer offered, the objective has it, the depot (its watch, the leaf and its gusts) as before', r.cyl && !r.lockerOffered && r.room === 'zeelich' && r.watch === 4 && r.door.knocksIn30s >= 1, r);
}

done();
await browser.close();
fs.rmSync(LOAD, { force: true });
