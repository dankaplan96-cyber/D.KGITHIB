// CAM-FOLLOW (the user on build 169: "neither camera really follows behind Twinsen — let the new one stand at his
// back"): the Follow camera, the second choice in Settings → Camera, is a chase camera behind his back. By input (the
// keys a player presses), at 60 fps unless named, on open ground (Citadel, else Desert Island) and against a wall:
//   1. the setting: three choices, LBA2 the default for a new player (and its view never turns on a run across it),
//      Follow chosen by a click and kept after a reload, an unknown saved value falls back to LBA2
//   2. behind his back: within 15° of his facing within 0.6 s of a turn on the spot (tank controls) and while he
//      stands; the view turns with him while he turns, never overshoots, never more than 4.1° a frame at 60 fps (240°/s)
//      nor 10° at 30 fps; on a run it stays behind him
//   3. walking backwards (tank controls: Down) leaves the view where it is; camera-relative controls pushed back
//      (toward the camera) hold its heading while he runs at it, and Up after it brings it round behind him again
//   4. camera-relative (Modern) controls: Up goes where the view looks with no loop (the view holds still); a held
//      side arrow keeps his way while the view comes round behind him; let go and Up, he goes where it now looks
//   5. walls: with a wall behind him the arm is drawn in (the camera between him and the wall), let out slowly as he
//      walks away (≤ 2.6 m/s), drawn in as he backs up to it, and through a full turn beside it: every frame the camera
//      outside every collider, scenery volume and the terrain, and nothing solid between it and him
//   6. a lock-on: the view stands behind his shoulder on the line from the target (within 15°), both on screen every
//      frame while he moves locked; let go, it comes back behind him
//   7. comfort: the camera-shake setting is respected (Off: no tremor); indoors (the iso rooms) nothing changes
// SHOTS=<dir> writes frames of a run, a turn, a wall pull-in and a lock-on (tools: docs/lba3-production/reviews/
// CAM-FOLLOW/ holds the strips). GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker({ info: 'always' });
const SHOTS = process.env.SHOTS || '';
const { browser, context, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await ev(() => game.frame(1 / 60, true)); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
await open(page, '?nocine');

// ---------------------------------------------------------------- 1. the setting
const set0 = await ev(() => ({ cam: game.settings.camera, opts: [...document.querySelectorAll('[data-setting="camera"] button')].map((b) => [b.dataset.v, b.textContent.trim()]) }));
check('Settings → Camera offers three choices: Fixed (LBA2), Follow, Free; a new player starts on LBA2', set0.cam === 'lba' && set0.opts.map((o) => o[0]).join() === 'lba,follow,free' && set0.opts[1][1] === 'Follow', set0);
await ev(() => document.querySelector('[data-setting="camera"] [data-v="follow"]').click());
const set1 = await ev(() => ({ cam: game.settings.camera, rig: game.camRig.mode, on: document.querySelector('[data-setting="camera"] [data-v="follow"]').classList.contains('on'),
  stored: Object.keys(localStorage).filter((k) => /"camera":"follow"/.test(localStorage.getItem(k) || '')) }));
check('a click on Follow chooses it (the camera follows) and stores it', set1.cam === 'follow' && set1.rig === 'follow' && set1.on && set1.stored.length === 1, set1);
const he = await ev(() => { game.settings.lang = 'he'; game.applySettings(); const t = document.querySelector('[data-setting="camera"] [data-v="follow"]').textContent.trim(); game.settings.lang = 'en'; game.applySettings(); return t; });
check('the Hebrew label is "עוקבת"', he === 'עוקבת', he);
// CAM-FOLLOW (the user: "works well but feels too close and too low"): Settings → Camera distance, Medium by default
const cd = await ev(() => { const o = [...document.querySelectorAll('[data-setting="camDist"] button')].map((b) => [b.dataset.v, b.textContent.trim()]); game.settings.lang = 'he'; game.applySettings(); const heL = document.querySelector('#settings [data-i18n="cam_dist"]')?.textContent.trim(); game.settings.lang = 'en'; game.applySettings(); return { d: game.settings.camDist, opts: o, heL }; });
check('Settings → Camera distance offers Near, Medium, Far; Medium for a new player (Hebrew "מרחק מצלמה")', cd.d === 'medium' && cd.opts.map((o) => o[0]).join() === 'near,medium,far' && cd.opts[1][1] === 'Medium' && cd.heL === 'מרחק מצלמה', cd);

await menu(page, 'new');
await ev(async () => {
  const THREE = await import('three');
  const G = game, I = G.input, h = G.hero, C = G.camRig, P = G.physics;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { I.taps.add('KeyE'); G.step(0.05); }
  Object.assign(G.flags, { prologueDone: true, intro: true });
  const deg = (a) => (a * 180) / Math.PI, ad = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  window.F = {
    dt: 1 / 60, deg, ad,
    cam(m) { G.settings.camera = m; G.applySettings(); C.cut = false; },
    controls(c) { G.settings.controls = c; G.applySettings(); },
    place(s, a) { if (s.room) { if (G.room?.id !== s.room) G.enterRoom(s.room, null, true); } else if (G.room) G.exitRoom({ x: s.x, z: s.z, a }, true, true); G.step(0.3); h.pos.set(s.x, P.groundAt(s.x, s.z), s.z); h.angle = a; h.resetMotion(); h.vy = 0; h.onGround = true; h.behaviour = 'normal'; C.snap(); for (let t = 0; t < 1; t += 1 / 60) G.frame(1 / 60, false); },
    // hold keys for s seconds at `fps`; rec() after each frame
    hold(keys, s, rec, fps = 60) { const dt = 1 / fps; for (const k of keys) { I.keys.add(k); I.taps.add(k); } for (let t = 0; t < s - 1e-9; t += dt) { G.frame(dt, false); rec?.(); } for (const k of keys) I.keys.delete(k); },
    // the view's heading against "behind his back" (his facing + π), signed, in degrees
    off() { return +deg(ad(h.angle + Math.PI, C.yaw)).toFixed(2); },
    way() { return Math.atan2(h.vel.x, h.vel.y); },
    // the camera's forward on the ground (where Up goes with camera-relative controls)
    fwd() { return Math.atan2(-Math.sin(C.yaw), -Math.cos(C.yaw)); },
    // per frame: the view's turn (max, °), its accumulated turn, the offset from his back
    rec() {
      const R = { yaw0: C.yaw, prev: C.yaw, maxStep: 0, offs: [], modes: new Set() };
      R.fn = () => { R.maxStep = Math.max(R.maxStep, Math.abs(deg(ad(R.prev, C.yaw)))); R.prev = C.yaw; R.offs.push(F.off()); R.modes.add(C.why.mode); };
      return R;
    },
    turned(R) { return +Math.abs(deg(ad(R.yaw0, C.yaw))).toFixed(2); },
    // the camera inside something solid? (camclear's test: every enabled collider — a house's camSkip box by its
    // scenery volume —, the volumes, the terrain 0.3 m under it outdoors) → the reason or ''
    inside() {
      const c = G.camera.position, why = [], occ = G.room ? null : G.world.occ;
      if (G.room?.outdoor || !G.room) { const th = G.world.terrain.heightAt(c.x, c.z); if (c.y < th + 0.3) why.push('terrain ' + (th - c.y).toFixed(2)); }
      for (const k of P.near(c.x, c.z)) { if (!k.enabled || c.y >= k.top || c.y <= k.bottom || !P._inside(k, c.x, c.z, 0)) continue; if (k.camSkip && occ) continue; why.push(k.type + '@' + k.x.toFixed(1) + ',' + k.z.toFixed(1)); }
      if (occ) for (const v of occ.near(c.x, c.z)) { const t = occ.topAt(v, c.x, c.z); if (t > -Infinity && c.y >= v.y0 && c.y <= t && !v.camOnly) why.push('volume@' + v.x.toFixed(1) + ',' + v.z.toFixed(1)); }
      return why.join('; ');
    },
    // nothing solid between the camera and his head or chest (thin posts, rails and tree crowns he shows between, as
    // the camera's own sight rule)
    seen() {
      const c = G.camera.position, occ = G.room ? null : G.world.occ;
      const clear = (hy) => { const b = new THREE.Vector3(h.pos.x, h.pos.y + hy, h.pos.z), n = Math.ceil(c.distanceTo(b) / 0.25);
        for (let i = 1; i < n - 1; i++) { const p = c.clone().lerp(b, i / n);
          if ((G.room?.outdoor || !G.room) && G.world.terrain.heightAt(p.x, p.z) > p.y + 0.05) return false;
          for (const k of P.near(p.x, p.z)) if (k.enabled && !k.seeThrough && !k.fades && !(k.camSkip && occ) && !(k.type === 'cyl' && k.r < 1.5) && p.y < k.top && p.y > k.bottom && P._inside(k, p.x, p.z, 0)) return false;
          if (occ && occ.hit(p.x, p.y, p.z, new Set()) > -Infinity) return false; }
        return true; };
      return clear(1.5) || clear(1.0);
    },
    ndc(p, y = 0.9) { G.camera.updateMatrixWorld(); const v = new THREE.Vector3(p.x, p.y + y, p.z).project(G.camera); return [+v.x.toFixed(2), +v.y.toFixed(2), v.z]; },
  };
  // open ground for an 18 m run: walkable all the way, dry, no wall within 1.2 m of it, nothing tall within 10 m of
  // its middle and no scenery volume near. Citadel first, then Desert Island's open sand.
  const out = [];
  for (const rid of [null, 'desert']) {
    if (rid) { if (!G.rooms[rid]) continue; G.enterRoom(rid, null, true); G.step(0.5); }
    const cx = rid ? h.pos.x : -40, cz = rid ? h.pos.z : 0, occ = C.occ?.();
    for (let x = cx - 80; x <= cx + 80; x += 4) for (let z = cz - 100; z <= cz + 100; z += 4) {
      const y0 = P.groundAt(x, z); if (y0 < 0.3) continue;
      if (G.npcs.some((n) => n.present && Math.hypot(n.pos.x - x, n.pos.z - z) < 20)) continue;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4, sx = Math.sin(a), sz = Math.cos(a); let y = y0, ok = true;
        for (let d = 0.5; d <= 20 && ok; d += 0.5) { const ny = window.P._stepTo(x + sx * (d - 0.5), y, z + sz * (d - 0.5), x + sx * d, z + sz * d); if (ny == null || Math.abs(ny - y0) > 1.2 || ny < 0.3) ok = false; else y = ny; for (const o of [-1.2, 1.2]) if (ok && P.blockedAt(x + sx * d + sz * o, z + sz * d - sx * o, ny + 0.3, 0.3)) ok = false; }
        if (!ok) continue;
        const mx = x + sx * 9, mz = z + sz * 9;
        if (P.colliders.some((c) => c.enabled && !c.fades && !c.seeThrough && !(c.type === 'cyl' && c.r < 1.5) && c.top > y0 + 3 && Math.hypot(c.x - mx, c.z - mz) < 10)) continue;
        let vols = 0;
        if (occ) for (let ox = -20; ox <= 20; ox += 4) for (let oz = -20; oz <= 20; oz += 4) vols += occ.near(mx + ox, mz + oz).length;
        if (vols) continue;
        out.push({ room: rid, x, z, a });
      }
    }
    if (out.length) break;
  }
  window.F.spots = out;
  F.cam('follow');
});

const spot = await ev(() => {
  const { spots } = F, h = game.hero;
  for (const s of spots.slice(0, 40)) {
    F.cam('lba'); F.place(s, s.a); h.behaviour = 'athletic';
    const x0 = h.pos.x, z0 = h.pos.z; F.hold(['ArrowUp'], 3);
    const d = Math.hypot(h.pos.x - x0, h.pos.z - z0);
    if (d > 13) return { ...s, d: +d.toFixed(1), n: spots.length };
  }
  return { n: spots.length, none: true };
});
check('found open ground for an 18 m run (Citadel, else Desert Island)', !spot.none, spot);
if (!spot.none) {
// ---------------------------------------------------------------- 1b/2. LBA2 untouched; behind his back
const run = await ev((spot) => {
  const G = game, h = G.hero, C = G.camRig, out = {};
  // LBA2 (the default): turned 90° on the spot, then a run across the view: its heading never moves
  F.cam('lba'); F.place(spot, spot.a + Math.PI / 2); F.hold(['ArrowLeft'], (Math.PI / 2) / (100 * Math.PI / 180));
  let R = F.rec(); F.hold(['ArrowUp'], 4, R.fn); out.lba = { turned: F.turned(R), mode: [...R.modes] };
  // Follow: standing 2 s, then a turn on the spot 90° left (Classic, 100°/s), then standing 3 s
  F.cam('follow'); F.place(spot, spot.a + Math.PI / 2);
  R = F.rec(); F.hold([], 2, R.fn); out.standOff = Math.max(...R.offs.map(Math.abs));
  R = F.rec(); F.hold(['ArrowLeft'], 0.9, R.fn); const during = R.offs.slice(), turnedDuring = F.turned(R);
  const after = []; const R2 = F.rec(); F.hold([], 3, () => { R2.fn(); after.push(F.off()); });
  const sign = Math.sign(after[0]) || 1, t15 = after.findIndex((o) => Math.abs(o) <= 15), t3 = after.findIndex((o) => Math.abs(o) <= 3);
  out.turn = { turnedDuring, lagMax: Math.max(...during.map(Math.abs)), maxStep: +Math.max(R.maxStep, R2.maxStep).toFixed(2), within15At: t15 < 0 ? null : +((t15 + 1) / 60).toFixed(2), within3At: t3 < 0 ? null : +((t3 + 1) / 60).toFixed(2),
    overshoot: +Math.max(0, ...after.map((o) => -o * sign)).toFixed(2), standAfter: +Math.max(...after.slice(60).map(Math.abs)).toFixed(2), modes: [...R.modes, ...R2.modes] };
  // and back right 180° (Athletic, 169°/s), at 30 fps: never more than 10° a frame
  h.behaviour = 'athletic'; R = F.rec(); F.hold(['ArrowRight'], Math.PI / (169 * Math.PI / 180), R.fn, 30); F.hold([], 1, R.fn, 30);
  out.turn30 = { maxStep: +R.maxStep.toFixed(2), off: F.off() };
  // a run straight on for 4 s: behind his back all the way
  h.behaviour = 'athletic'; R = F.rec(); F.hold(['ArrowUp'], 4, R.fn); out.run = { maxOff: +Math.max(...R.offs.map(Math.abs)).toFixed(2), turned: F.turned(R) };
  G.step(1); h.behaviour = 'normal';
  return out;
}, spot);
check('LBA2 view (the default) unchanged: a run across the view never turns it', run.lba.turned < 0.5 && run.lba.mode.join() === 'lba', run.lba);
check('Follow: standing, the view stays behind his back (within 15°)', run.standOff <= 15, run);
check('Follow, Classic: a turn on the spot turns the view with him (it turns ≥ 65° while he turns 90°, never more than 25° behind)', run.turn.turnedDuring >= 65 && run.turn.lagMax <= 25, run.turn);
check('Follow: behind his back (within 15°) within 0.6 s of the turn, settled (within 3°) within 0.8 s, no overshoot (≤ 1°)', run.turn.within15At != null && run.turn.within15At <= 0.6 && run.turn.within3At != null && run.turn.within3At <= 0.8 && run.turn.overshoot <= 1 && run.turn.standAfter <= 1, run.turn);
check('Follow: smooth — never more than 4.1° a frame at 60 fps, 10° at 30 fps (a 180° turn at 169°/s)', run.turn.maxStep <= 4.1 && run.turn30.maxStep <= 10 && Math.abs(run.turn30.off) <= 15, { turn: run.turn, turn30: run.turn30 });
check('Follow: on a straight run the view stays behind his back (within 5°)', run.run.maxOff <= 5, run.run);

// running frames (docs/lba3-production/reviews/CAM-FOLLOW/)
if (SHOTS) {
  await ev((spot) => { F.cam('follow'); F.place(spot, spot.a); game.hero.behaviour = 'athletic'; }, spot);
  for (let i = 0; i < 5; i++) { await shot(`run-${i}`); await ev(() => F.hold(['ArrowUp'], 0.6)); }
  await ev((spot) => { F.place(spot, spot.a); game.hero.behaviour = 'normal'; }, spot);
  for (let i = 0; i < 6; i++) { await shot(`turn-${i}`); await ev(() => F.hold(['ArrowLeft'], 0.3)); }
  await ev(() => game.step(1));
}

// ---------------------------------------------------------------- 3. backwards
const back = await ev((spot) => {
  const G = game, h = G.hero, C = G.camRig, out = {};
  F.cam('follow'); F.place(spot, spot.a + Math.PI);
  // Classic: Down walks him backwards, his facing kept: the view stays
  let x0 = h.pos.x, z0 = h.pos.z, R = F.rec(); F.hold(['ArrowDown'], 2.5, R.fn); F.hold([], 0.5, R.fn);
  out.classic = { moved: +Math.hypot(h.pos.x - x0, h.pos.z - z0).toFixed(2), turned: F.turned(R), maxStep: +R.maxStep.toFixed(2) };
  // Modern: from behind his back, Down (toward the camera) for 2.5 s: he turns and runs at the camera, its heading held
  F.controls('modern'); F.place(spot, spot.a); x0 = h.pos.x; z0 = h.pos.z; R = F.rec(); let onScreen = true;
  F.hold(['ArrowDown'], 2.5, () => { R.fn(); const n = F.ndc(h.pos); if (Math.abs(n[0]) > 0.95 || Math.abs(n[1]) > 0.95 || n[2] > 1) onScreen = false; });
  const facesCam = +Math.abs(F.deg(F.ad(h.angle, C.yaw))).toFixed(1);
  F.hold([], 1, R.fn);
  out.modern = { moved: +Math.hypot(h.pos.x - x0, h.pos.z - z0).toFixed(2), turned: F.turned(R), facesCam, onScreen };
  // then Up: he turns away and runs on; the view comes round behind his back
  const R2 = F.rec(); F.hold(['ArrowUp'], 1.4, R2.fn); out.modernUp = { off: F.off(), maxStep: +R2.maxStep.toFixed(2), turned: F.turned(R2) };
  F.controls('classic'); G.step(0.5);
  return out;
}, spot);
check('Follow, Classic: walking backwards (Down) never turns the view', back.classic.moved > 2.5 && back.classic.turned <= 1, back.classic);
check('Follow, Modern: pushed back toward the camera, he runs at it and the view does not spin round (≤ 5°); he stays on screen', back.modern.moved > 3 && back.modern.facesCam <= 30 && back.modern.turned <= 5 && back.modern.onScreen, back.modern);
check('Follow, Modern: then Up, the view comes round behind his back (within 15°), smoothly', Math.abs(back.modernUp.off) <= 15 && back.modernUp.maxStep <= 4.1, back.modernUp);

// ---------------------------------------------------------------- 4. Modern controls: Up goes where the view looks
const modern = await ev((spot) => {
  const G = game, h = G.hero, C = G.camRig, out = {};
  F.controls('modern'); F.cam('follow');
  F.place(spot, spot.a); const fwd0 = F.fwd(); let R = F.rec(); F.hold(['ArrowUp'], 2, R.fn);
  out.up = { wayVsView: +Math.abs(F.deg(F.ad(fwd0, F.way()))).toFixed(1), turned: F.turned(R) };
  // a held side arrow: his way kept while the view comes round behind him
  F.place(spot, spot.a - Math.PI / 2);
  R = F.rec(); F.hold(['ArrowLeft'], 0.5, R.fn); const w0 = F.way();
  F.hold(['ArrowLeft'], 3.5, R.fn); const w1 = F.way();
  out.side = { wayDrift: +Math.abs(F.deg(F.ad(w0, w1))).toFixed(1), turned: F.turned(R), off: F.off(), maxStep: +R.maxStep.toFixed(2) };
  // let go and Up: on along the way the view now looks
  G.step(0.3); const f1 = F.fwd(); F.hold(['ArrowUp'], 0.8); out.upAfter = +Math.abs(F.deg(F.ad(f1, F.way()))).toFixed(1);
  F.controls('classic');
  return out;
}, spot);
check('Follow, Modern: Up goes where the view looks (within 8°), the view holds still (no loop: ≤ 3°)', modern.up.wayVsView <= 8 && modern.up.turned <= 3, modern.up);
check('Follow, Modern: a held side arrow keeps his way (≤ 10°) while the view comes round behind him (within 15°)', modern.side.wayDrift <= 10 && modern.side.turned >= 60 && Math.abs(modern.side.off) <= 15 && modern.side.maxStep <= 4.1, modern.side);
check('Follow, Modern: let go and Up, he goes where the view now looks (within 15°)', modern.upAfter <= 15, modern);

// ---------------------------------------------------------------- 6. a lock-on
const lock = await ev((spot) => {
  const G = game, h = G.hero, C = G.camRig, out = {};
  const mite = G.enemies.find((e) => e.id?.startsWith('mite'));
  if (!mite) return { none: true };
  F.cam('follow'); F.place(spot, spot.a); h.behaviour = 'athletic';
  // the mite 7 m away, 50° to his right: he turns toward it a little and locks on
  const a = h.angle - 0.9, mx = h.pos.x + Math.sin(a) * 7, mz = h.pos.z + Math.cos(a) * 7;
  mite.pos.set(mx, G.physics.groundAt(mx, mz), mz); mite.home = { x: mx, z: mz }; mite.setPresent(true); mite.hp = mite.maxHp; mite.state = 'idle';
  G.step(0.2); F.hold(['ArrowRight'], 0.3); F.hold(['KeyL'], 1 / 60);
  out.locked = !!G.targeting.lock;
  F.hold([], 0.8);
  const line = () => Math.atan2(h.pos.x - mite.pos.x, h.pos.z - mite.pos.z);
  out.offLine = +F.deg(F.ad(line(), C.yaw)).toFixed(1);
  // he moves locked (Modern controls): toward it 1 s, then to the side 1.2 s: both on screen every locked frame
  F.controls('modern');
  let both = true, worst = null, lockedN = 0; const R = F.rec();
  const each = () => { R.fn(); if (!G.targeting.lock) return; lockedN++; const a1 = F.ndc(h.pos), b1 = F.ndc(mite.pos, mite.aimY ?? 0.5); const m = Math.max(Math.abs(a1[0]), Math.abs(a1[1]), Math.abs(b1[0]), Math.abs(b1[1])); if (m > 0.95 || a1[2] > 1 || b1[2] > 1) { both = false; worst ??= { a1, b1, arm: C.dist, pitch: C.pitch, d: Math.hypot(h.pos.x - mite.pos.x, h.pos.z - mite.pos.z) }; } };
  F.hold(['ArrowUp'], 1, each); F.hold(['ArrowLeft'], 1.2, each);
  out.walk = { both, worst, lockedN, offLine: +F.deg(F.ad(line(), C.yaw)).toFixed(1), maxStep: +R.maxStep.toFixed(2), inside: F.inside(), d: +Math.hypot(h.pos.x - mite.pos.x, h.pos.z - mite.pos.z).toFixed(1) };
  F.controls('classic');
  window.__lockMite = mite;
  return out;
}, spot);
if (lock.none) check('a mite to lock on to', false, lock);
else {
  check('Follow, lock-on: the view stands behind his shoulder on the line from the target (within 15°)', lock.locked && Math.abs(lock.offLine) <= 15, lock);
  check('Follow, lock-on: Twinsen and the target both on screen every locked frame (≥ 2 s) while he moves; smooth (≤ 4.1° a frame)', lock.walk.lockedN >= 120 && lock.walk.both && lock.walk.maxStep <= 4.1 && !lock.walk.inside, lock.walk);
  if (SHOTS) {
    await ev(() => { game.hero.behaviour = 'normal'; });
    for (let i = 0; i < 5; i++) { await shot(`lock-${i}`); await ev(() => { F.controls('modern'); F.hold(['ArrowLeft'], 0.6); F.controls('classic'); }); }
  }
  const rel = await ev(() => {
    const G = game, mite = window.__lockMite;
    G.targeting.release?.(); if (G.targeting.lock) G.targeting.lock = null;
    mite.setPresent(false); mite.pos.set(mite.pos.x + 300, mite.pos.y, mite.pos.z);
    const R = F.rec(); F.hold([], 1.5, R.fn);
    return { off: F.off(), maxStep: +R.maxStep.toFixed(2) };
  });
  check('Follow: the lock let go, the view comes back behind his back (within 15° in 1.5 s), smoothly', Math.abs(rel.off) <= 15 && rel.maxStep <= 4.1, rel);
}
await ev(() => { game.hero.behaviour = 'normal'; game.step(0.5); });

// ---------------------------------------------------------------- 7. comfort: the camera shake setting
// the three distances on open ground, standing behind him: each a step further back and higher than the last
const dist = await ev((spot) => {
  const G = game, h = G.hero, out = {};
  F.cam('follow');
  for (const d of ['near', 'medium', 'far']) {
    G.settings.camDist = d; G.applySettings(); F.place(spot, spot.a); F.hold([], 1);
    const c = G.camera.position; out[d] = { back: +Math.hypot(c.x - h.pos.x, c.z - h.pos.z).toFixed(2), up: +(c.y - h.pos.y).toFixed(2), off: F.off(), look: +(-Math.asin((G.camRig.look.y - c.y) / G.camRig.look.distanceTo(c)) * 57.3).toFixed(1) };
  }
  G.settings.camDist = 'medium'; G.applySettings();
  return out;
}, spot);
check('Camera distance: Medium stands further back and higher than Near, Far further and higher still; behind his back each time', dist.medium.back > dist.near.back + 1 && dist.medium.up > dist.near.up + 0.5 && dist.far.back > dist.medium.back + 1 && dist.far.up > dist.medium.up + 0.5 && ['near', 'medium', 'far'].every((d) => Math.abs(dist[d].off) <= 3), dist);
const shake = await ev((spot) => {
  const G = game, C = G.camRig, out = {};
  F.cam('follow'); F.place(spot, spot.a);
  for (const s of ['off', 'on']) {
    G.settings.shake = s; G.applySettings(); C.shake(0.5); let d = 0;
    F.hold([], 0.3, () => { d = Math.max(d, G.camera.position.distanceTo(C.base)); });
    out[s] = +d.toFixed(3);
  }
  return out;
}, spot);
check('Follow: the camera-shake setting is respected (Off: no tremor; On: a tremor)', shake.off === 0 && shake.on > 0.01, shake);
}

// ---------------------------------------------------------------- 5. walls: the spring arm
// a wall behind him: a tall solid on Citadel (a house's scenery volume, a wall, a tower), Twinsen 2 m out from one of
// its faces facing away, with walkable open ground 9 m ahead of him
const wall = await ev(() => {
  const G = game, h = G.hero, C = G.camRig, P = G.physics;
  if (G.room) G.exitRoom({ x: -40, z: 0, a: 0 }, true, true); G.step(0.3);
  const occ = G.world.occ, cands = [];
  for (const c of P.colliders) { if (!c.enabled || c.fades || c.seeThrough || c.type === 'cyl' || c.hw < 1.5 || c.hd < 1.5) continue; cands.push(c); }
  const spots = [];
  for (const c of cands) for (const [lx, lz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    // (the box's local axes in world: local x = (cos, -sin), local z = (sin, cos) — physics._inside's inverse)
    const nx = lx * c.cos + lz * c.sin, nz = -lx * c.sin + lz * c.cos, ext = lx ? c.hw : c.hd;
    const x = c.x + nx * (ext + 2.0), z = c.z + nz * (ext + 2.0), y0 = P.groundAt(x, z);
    if (y0 < 0.3 || c.top - y0 < 4 || c.bottom > y0 + 0.5 || P.blockedAt(x, z, y0, 0.4)) continue;
    if (G.npcs.some((n) => n.present && Math.hypot(n.pos.x - x, n.pos.z - z) < 6)) continue;
    let y = y0, ok = true;
    for (let d = 0.5; d <= 9 && ok; d += 0.5) { const ny = window.P._stepTo(x + nx * (d - 0.5), y, z + nz * (d - 0.5), x + nx * d, z + nz * d); if (ny == null || Math.abs(ny - y0) > 1 || ny < 0.3) ok = false; else y = ny; for (const o of [-1, 1]) if (ok && P.blockedAt(x + nx * d + nz * o, z + nz * d - nx * o, ny + 0.3, 0.3)) ok = false; }
    if (!ok) continue;
    // (the wall really is in the way of the full arm: its face 2 m behind him, the arm 7 m)
    spots.push({ x, z, a: Math.atan2(nx, nz), wall: c.type + '@' + c.x.toFixed(1) + ',' + c.z.toFixed(1), top: +(c.top - y0).toFixed(1), camSkip: !!c.camSkip });
  }
  window.__wallSpots = spots;
  return { cands: cands.length, spots: spots.length, first: spots.slice(0, 3) };
});
check('found a wall with open ground in front of it on Citadel', wall.spots > 0, wall);
if (wall.spots > 0) {
  const W = await ev(() => {
    const G = game, h = G.hero, C = G.camRig, out = { tried: [] };
    F.cam('follow'); F.controls('classic');
    const watch = (o) => () => { const why = F.inside(); if (why) { o.inside++; o.why ??= why; } if (!F.seen()) { o.unseen++; o.at ??= { cam: G.camera.position.toArray().map((v) => +v.toFixed(2)), hero: h.pos.toArray().map((v) => +v.toFixed(2)) }; } o.frames++; o.arm.push(C.dist); };
    for (const s of window.__wallSpots.slice(0, 12)) {
      const r = { spot: s };
      // (a) placed against the wall, facing away: the arm drawn in at once, the camera between him and the wall
      F.place({ x: s.x, z: s.z }, s.a); const a0 = C.dist;
      if (a0 > 6) { out.tried.push({ spot: s, arm: +a0.toFixed(2), why: 'not in the way' }); continue; }
      r.start = { arm: +a0.toFixed(2), inside: F.inside(), seen: F.seen(), toHero: +Math.hypot(G.camera.position.x - h.pos.x, G.camera.position.z - h.pos.z).toFixed(2) };
      // (b) walking away 3 s: it lets out slowly
      let o = { frames: 0, inside: 0, unseen: 0, arm: [] }; F.hold(['ArrowUp'], 3, watch(o)); F.hold([], 2.5, watch(o));
      let vOut = 0; for (let i = 1; i < o.arm.length; i++) vOut = Math.max(vOut, (o.arm[i] - o.arm[i - 1]) * 60);
      r.away = { inside: o.inside, unseen: o.unseen, why: o.why, at: o.at, armEnd: +o.arm[o.arm.length - 1].toFixed(2), vOut: +vOut.toFixed(2) };
      // (c) backing up to the wall (Down) 4 s: drawn in as he goes, never inside, always seen
      o = { frames: 0, inside: 0, unseen: 0, arm: [] }; F.hold(['ArrowDown'], 4, watch(o)); F.hold([], 0.5, watch(o));
      r.backUp = { inside: o.inside, unseen: o.unseen, why: o.why, at: o.at, armEnd: +o.arm[o.arm.length - 1].toFixed(2), armMin: +Math.min(...o.arm).toFixed(2) };
      // (d) a full turn on the spot there (Left 3.6 s at 100°/s)
      o = { frames: 0, inside: 0, unseen: 0, arm: [] }; const R = F.rec(); F.hold(['ArrowLeft'], 3.6, () => { watch(o)(); R.fn(); }); F.hold([], 0.6, watch(o));
      r.turn = { inside: o.inside, unseen: o.unseen, why: o.why, at: o.at, maxStep: +R.maxStep.toFixed(2) };
      out.tried.push(r); out.ok = r; break;
    }
    return out;
  });
  const r = W.ok;
  if (!r) check('a wall spot where the full arm would stand behind the wall', false, W.tried.slice(0, 4));
  else {
    console.log('INFO wall spot', JSON.stringify(r.spot), 'skipped', W.tried.length - 1);
    check('Follow, a wall behind him: the arm drawn in (camera between him and the wall), outside everything, he is seen', r.start.arm <= 5 && !r.start.inside && r.start.seen && r.start.toHero < 4.5, r.start);
    check('Follow, walking away from the wall: let out slowly (≤ 2.6 m/s) to the full arm; never inside anything, he is always seen', r.away.inside === 0 && r.away.unseen === 0 && r.away.vOut <= 2.6 && r.away.armEnd >= 6.5, r.away);
    check('Follow, backing up to the wall: drawn in as he goes; never inside anything, he is always seen', r.backUp.inside === 0 && r.backUp.unseen === 0 && r.backUp.armEnd <= 5, r.backUp);
    check('Follow, a full turn on the spot by the wall: never inside anything, he is always seen, smooth (≤ 4.1° a frame)', r.turn.inside === 0 && r.turn.unseen === 0 && r.turn.maxStep <= 4.1, r.turn);
    // (and at Far: the arm drawn in the same, never inside anything, he is seen while he backs up to the wall)
    const far = await ev((s) => {
      const G = game, C = G.camRig; G.settings.camDist = 'far'; G.applySettings();
      F.place({ x: s.x, z: s.z }, s.a); const o = { start: { arm: +C.dist.toFixed(2), inside: F.inside(), seen: F.seen() }, inside: 0, unseen: 0, full: 0 };
      F.hold(['ArrowUp'], 3); F.hold([], 3); o.full = +C.dist.toFixed(2);
      F.hold(['ArrowDown'], 4, () => { if (F.inside()) o.inside++; if (!F.seen()) o.unseen++; }); o.end = +C.dist.toFixed(2);
      G.settings.camDist = 'medium'; G.applySettings();
      return o;
    }, r.spot);
    check('Follow at Far by the wall: drawn in at the wall, out to its longer arm away from it, never inside anything, he is always seen backing up', far.start.arm <= 5 && !far.start.inside && far.start.seen && far.full >= 9 && far.inside === 0 && far.unseen === 0 && far.end <= 5, far);
    if (SHOTS) {
      await ev((s) => { F.place({ x: s.x, z: s.z }, s.a); F.hold(['ArrowUp'], 3); F.hold([], 2.5); }, r.spot);
      for (let i = 0; i < 6; i++) { await shot(`wall-${i}`); await ev(() => F.hold(['ArrowDown'], 0.7)); }
    }
  }
}

// ---------------------------------------------------------------- 7b. indoors: the iso view, nothing follows
const iso = await ev(() => {
  const G = game, h = G.hero, C = G.camRig;
  F.cam('follow'); G.enterRoom('house', null, true); G.step(0.5);
  const c = G.room.center || { x: h.pos.x, z: h.pos.z }; h.pos.set(c.x - 2, G.physics.groundAt(c.x - 2, c.z), c.z); h.angle = Math.PI / 2; h.resetMotion(); G.step(0.5);
  const R = F.rec(); F.hold(['ArrowUp'], 0.8, R.fn); F.hold(['ArrowLeft'], 0.5, R.fn); F.hold(['ArrowUp'], 1.6, R.fn);
  const out = { room: G.room?.id, modes: [...R.modes], turned: F.turned(R) };
  G.exitRoom({ x: -40, z: -5 }, true); G.step(0.5);
  return out;
});
check('Follow indoors: the iso view as before (it never turns)', iso.room === 'house' && iso.modes.every((m) => m === 'iso') && iso.turned < 0.5, iso);

// ---------------------------------------------------------------- 8. the stored choice after a restart; an unknown one
// (a fresh browser on the stored profile, as tests/lib/boot.mjs quitAndKeep does)
const state = path.join(os.tmpdir(), `camfollow-${process.pid}.json`);
await ev(() => { game.settings.camera = 'follow'; game.settings.camDist = 'far'; game.applySettings(); game.saveSettings?.(); });
await context.storageState({ path: state });
await page.waitForLoadState('networkidle').catch(() => {});   // (its models still loading when the browser closes read as failed requests)
await browser.close();
const B2 = await launch({ width: 640, height: 360, storageState: state });
await open(B2.page, '?nocine');
const set2 = await B2.page.evaluate(() => ({ cam: game.settings.camera, rig: game.camRig.mode, d: game.settings.camDist, arm: game.camRig.chDist?.arm }));
check('Follow and its distance (Far) are kept after a restart', set2.cam === 'follow' && set2.rig === 'follow' && set2.d === 'far' && set2.arm > 10, set2);
await B2.page.evaluate(() => { for (const k of Object.keys(localStorage)) { const v = localStorage.getItem(k) || ''; if (/"camera":"follow"/.test(v)) localStorage.setItem(k, v.replace('"camera":"follow"', '"camera":"orbit"')); } });
await B2.context.storageState({ path: state });
await B2.page.waitForLoadState('networkidle').catch(() => {});
await B2.browser.close();
const B3 = await launch({ width: 640, height: 360, storageState: state });
await open(B3.page, '?nocine');
const set3 = await B3.page.evaluate(() => ({ cam: game.settings.camera, rig: game.camRig.mode }));
check('an unknown stored camera falls back to LBA2', set3.cam === 'lba' && set3.rig === 'lba', set3);
await B3.page.waitForLoadState('networkidle').catch(() => {});
await B3.browser.close();
fs.rmSync(state, { force: true });
done();
