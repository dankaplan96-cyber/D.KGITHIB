// CAM-DOORS (the user, playing with Settings → Camera on Follow: "the camera doesn't always lock when I go from room
// to room"). Through Citadel's doors by input, in chapter 2 (every town door open): the street doors of the houses and
// shops, the doors between two rooms of one building (Twinsen's house and its cellar, the tavern and its cellar), and
// out again onto the street. Each crossing: walked into the door with the arrow keys (tests/lib/player.js), the arrow
// held on through the fade and after it, 60 fps. Measured from the frame the scene swaps:
//   - out onto the street (the Follow chase camera): 0.6 s on, the camera stands behind his heading (the camera's own
//     bearing from him, within 15° of his back), it never swung off his back on the way (within 25° every frame), it
//     turns no more than 4.1° a frame, and he still walks the way he came out (within 15°)
//   - into a room (Follow keeps the rooms' fixed iso view, CAM-FOLLOW): the iso view from the first frame, still at 0.6 s,
//     and he walks on the way he came in
//   - Modern (camera-relative) controls on three doors, the same arrow held from one scene into the next: he keeps
//     walking the way he went through the door (a direction held kept the old view's heading: out of a room's iso view
//     he turned off his way and the chase camera swung after him), and the camera settles behind him as above
// GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');

const res = await page.evaluate(() => {
  const G = game, h = G.hero, I = G.input, rig = G.camRig, P0 = G.physics;
  const deg = (a) => (a * 180) / Math.PI, ad = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const talkAll = () => { for (let i = 0; i < 120 && G.state !== 'play'; i++) { I.taps.add('KeyE'); G.step(0.05); } };
  talkAll();
  Object.assign(G.flags, { prologueDone: true, intro: true }); h.hasBall = true; G.story.nextChapter(); G.step(0.5); talkAll();
  const setCtl = (c) => { G.settings.camera = 'follow'; G.settings.controls = c; G.settings.autoControls = 'off'; G.applySettings(); rig.cut = false; };
  setCtl('classic');
  const here = () => G.room?.id ?? 'citadel';
  const tp = (x, z, a) => { h.pos.set(x, P0.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set?.(0, 0); h.resetMotion?.(); rig.snap(); G.step(0.3); };
  // hold `keys` from now until the scene has swapped and 0.6 s more (or 4 s pass): every frame recorded
  const crossHold = (keys, from, maxF = 240) => {
    for (const k of keys) { I.keys.add(k); I.taps.add(k); }
    const rec = [];
    let swap = -1;
    for (let f = 0; f < maxF; f++) {
      G.frame(1 / 60, false);
      const c = G.camera.position;
      rec.push({ room: here(), trans: !!G.trans, state: G.state, iso: rig.why.mode === 'iso', bear: Math.atan2(c.x - h.pos.x, c.z - h.pos.z), head: h.angle, pos: [h.pos.x, h.pos.z] });
      if (swap < 0 && here() !== from) swap = f;
      if (swap >= 0 && f >= swap + 36) break;
    }
    for (const k of keys) I.keys.delete(k);
    return { rec, swap };
  };
  const measure = (name, from, r) => {
    const { rec, swap } = r;
    if (swap < 0) return { name, fail: 'no scene change', at: here() };
    const after = rec.slice(swap), last = after[after.length - 1], first = after[0];
    const dialog = after.some((f) => f.state !== 'play');
    const out = { name, from, to: last.room, dialog };
    if (last.iso) {
      // a room: the fixed iso view from the first frame, and his way kept
      out.kind = 'room';
      out.isoAll = after.every((f) => f.iso);
      out.walkTurn = +Math.abs(deg(ad(first.head, last.head))).toFixed(1);
      out.ok = out.isoAll && (dialog || out.walkTurn <= 15);
      return out;
    }
    out.kind = 'street';
    const rel = (f) => ad(f.head + Math.PI, f.bear);
    out.rel06 = +Math.abs(deg(rel(last))).toFixed(1);
    out.relMax = +Math.max(...after.map((f) => Math.abs(deg(rel(f))))).toFixed(1);
    let step = 0; for (let k = 2; k < after.length; k++) step = Math.max(step, Math.abs(deg(ad(after[k - 1].bear, after[k].bear))));
    out.maxStep = +step.toFixed(1);
    out.walkTurn = +Math.abs(deg(ad(first.head, last.head))).toFixed(1);
    out.ok = dialog ? out.rel06 <= 15 : out.rel06 <= 15 && out.relMax <= 25 && out.maxStep <= 4.1 && out.walkTurn <= 15;
    return out;
  };
  // walk into the door at (x, z) by input (tank controls, the harness's A*); the arrow held on through the fade
  const goThrough = (name, x, z) => {
    const from = here();
    const g = P.go(x, z, { tol: 0.25, stopOnTrans: true, fight: false });
    if (g.r !== 'transition') return { name, fail: 'did not reach the door: ' + g.r, at: here() };
    return measure(name, from, crossHold(['ArrowUp'], from));
  };
  const settle = () => { I.keys.clear(); talkAll(); G.step(0.4); talkAll(); };
  const out = [];
  const exitOf = (to) => G.room.exits.find((e) => (to ? e.room === to : !e.room));
  const leave = (name) => { const e = exitOf(); if (!e) { out.push({ name, fail: 'no street exit in ' + here() }); return; } out.push(goThrough(name, e.x, e.z)); settle(); };
  const enter = (id) => {
    const d = G.story.doors().find((x) => x.room === id && !x.region);
    if (!d) { out.push({ name: 'street → ' + id, fail: 'no door' }); return false; }
    // start 3 m out in front of the door: where its exit puts him back on the street
    if (G.room) { G.exitRoom({ x: d.x, z: d.z + 4 }, true, true); G.step(0.3); }
    const R = G.rooms[id] || (G.regions.ensure(id, 'enter'), G.rooms[id]);
    const e = R?.exits.find((x) => !x.room), to = e && G.story.exitTo(e.to);
    let sx = to && !to.room ? to.x : d.x, sz = to && !to.room ? to.z : d.z + 3;
    { const L = Math.hypot(sx - d.x, sz - d.z) || 1; sx = d.x + ((sx - d.x) / L) * (L + 1.5); sz = d.z + ((sz - d.z) / L) * (L + 1.5); }
    tp(sx, sz, Math.atan2(d.x - sx, d.z - sz)); settle();
    if (G.settings.controls === 'modern') {
      // (Modern: the Follow camera at his back, Up walks him at the door; held on into the room)
      const from = here();
      out.push({ ...measure('modern street → ' + id, from, crossHold(['ArrowUp'], from, 480)), modern: true });
    } else out.push(goThrough('street → ' + id, d.x, d.z));
    settle();
    return here() === id;
  };
  // the town's doors, in and out (classic controls, as a keyboard player starts)
  for (const id of ['house', 'bazoo', 'pharmacy', 'ticket', 'tavern', 'nbrhouse', 'nellhouse', 'office', 'baggage', 'terminal']) {
    if (!enter(id)) continue;
    // the doors between two rooms of one building: down to the cellar and back up
    const inner = G.room.exits.find((e) => e.room);
    if (inner) {
      const a = here(), b = inner.room;
      out.push(goThrough(a + ' → ' + b, inner.x, inner.z)); settle();
      if (here() === b) { const back = exitOf(a); if (back) { out.push(goThrough(b + ' → ' + a, back.x, back.z)); settle(); } }
    }
    if (G.room) leave(here() + ' → street');
  }
  // Modern controls: the arrow that walks him through the door in one view held on into the next
  const keysFor = (yaw, want) => {
    // the arrow (or two) whose camera-relative way is nearest `want` under the view's heading `yaw`
    const combos = [['ArrowUp'], ['ArrowDown'], ['ArrowLeft'], ['ArrowRight'], ['ArrowUp', 'ArrowLeft'], ['ArrowUp', 'ArrowRight'], ['ArrowDown', 'ArrowLeft'], ['ArrowDown', 'ArrowRight']];
    let best = null;
    for (const c of combos) {
      const mx = (c.includes('ArrowRight') ? 1 : 0) - (c.includes('ArrowLeft') ? 1 : 0), my = (c.includes('ArrowUp') ? 1 : 0) - (c.includes('ArrowDown') ? 1 : 0);
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const a = Math.atan2(rx * mx + fx * my, rz * mx + fz * my), e = Math.abs(ad(a, want));
      if (!best || e < best.e) best = { c, a, e };
    }
    return best;
  };
  setCtl('modern');
  for (const id of ['bazoo', 'tavern', 'house']) {
    if (!enter(id)) continue;
    const e = exitOf();
    if (!e) continue;
    // from 1.6 m inside the door, along an arrow's way under the room's view
    const R = G.room, cx = R.spawn.x, cz = R.spawn.z, inward = Math.atan2(cx - e.x, cz - e.z);
    const k = keysFor(rig.yaw, inward + Math.PI);
    const sx = e.x - Math.sin(k.a) * 1.6, sz = e.z - Math.cos(k.a) * 1.6;
    tp(sx, sz, k.a); I.keys.clear(); G.step(0.2);
    const from = here();
    out.push({ ...measure('modern ' + id + ' → street (' + k.c.join('+') + ')', from, crossHold(k.c, from)), modern: true });
    settle();
  }
  setCtl('classic');
  return out;
});

for (const x of res) console.log('   ', JSON.stringify(x));
const street = res.filter((x) => x.kind === 'street' && !x.modern), rooms = res.filter((x) => x.kind === 'room'), modern = res.filter((x) => x.modern);
const fails = res.filter((x) => x.fail);
check(`every planned crossing happened by input (${res.length - fails.length}/${res.length})`, fails.length === 0, fails);
check(`out onto the street (${street.length} doors): Follow behind his heading 0.6 s after the swap (≤15°), never swung off his back (≤25°), ≤4.1°/frame, his way kept`,
  street.length >= 8 && street.every((x) => x.ok), street.filter((x) => !x.ok));
check(`into a room or between two rooms (${rooms.length}): the iso view from the first frame, his way kept`, rooms.length >= 8 && rooms.every((x) => x.ok), rooms.filter((x) => !x.ok));
check(`Modern controls, the arrow held through the door (${modern.length}): his way kept, Follow behind him`, modern.length >= 2 && modern.every((x) => x.ok), modern.filter((x) => !x.ok));
await browser.close();
process.exit(done(errs) ? 1 : 0);
