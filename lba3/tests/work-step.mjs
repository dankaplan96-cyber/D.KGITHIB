// NO-AIR 3: the last step up to the thing a stop works at (walkers.js Resident.stepTick, roomlife.js StoryRounds.stepTick,
// workhands.js workStep), in the running game: a resident and one of the story's people are let walk their rounds with
// the hero by (the hands' layer runs only for people on screen), and what they do at a stop whose thing is out of reach
// from its slot is followed frame by frame:
//   - they reach the slot, the action is stood down there, they step up to the thing and work with their hands on it
//     (tests/lib/contact.js: the working hands within 5 cm of a drawn surface), not inside any collider, feet on the ground;
//   - they step back to the slot before going on, and the round goes on (the next stop is reached);
//   - the next visit they step up at once (no standing first);
//   - talked to while stepped up (engage / release, as story/citizens.js does) they stop, turn, and afterwards work on
//     and leave by the slot as before.
// ISO: the chapter state is set by its flags and the people are started one stop before the one watched; everything
// after is the game's own stepping. The harness steps the game without drawing it, and it is the drawing that brings
// the areas' world matrices up to date (engine/drawcull.js): they are updated here after each step, as a drawn frame
// does — without that the hands' layer reads every static mesh at the world's origin and finds nothing anywhere. Nothing of this is saved (a resident's round starts again after a load).
// GAME_URL (default http://localhost:8123/). Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
page.setDefaultTimeout(1800000);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await page.addScriptTag({ path: fileURLToPath(new URL('./lib/contact.js', import.meta.url)) });
await ev(async () => {
  window.WH = await import('./src/game/workhands.js');
  const G = game; P.settle();
  window.BASE = JSON.parse(JSON.stringify(G.flags));
  G.regions.ensure('hamalayi', 'test'); G.story.applyFlags(); G.step(0.2);
  window.setChapter = (key, extra = {}) => {
    const f = G.flags; P.settle();
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.step(0.2);
  };
  // the hero stood `d` m from (x, z), looking at it (the camera behind him: the place is on screen)
  window.heroBy = (x, z, a, d = 5) => { const h = G.hero, hx = x + Math.sin(a) * d, hz = z + Math.cos(a) * d; h.pos.set(hx, G.physics.groundAt(hx, hz), hz); h.angle = Math.atan2(x - hx, z - hz); h.onGround = true; h.vy = 0; if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.5); P.settle(); };
  const TWO = new Set(['tinker', 'kneelWork', 'potting', 'search', 'use']);
  // (a one-off move — a thing set down — touches for a moment of it; a working pose all the while once it has settled)
  const SHOT = { setDown: [0.47, 0.7], pickup: [0.37, 0.55], reachHigh: [0.52, 0.76] };
  window.atContact = (anim, t) => (SHOT[anim] ? t > SHOT[anim][0] && t < SHOT[anim][1] : t > 0.7);
  window.gapOf = (n, anim) => { G.scene.updateMatrixWorld(); return Math.max(...(TWO.has(anim) ? ['R', 'L'] : ['R']).map((s) => CT.handGap(n, s, CT.roots(), 0.8).d ?? 0.8)); };
});

// ---- a resident: Grum at Lhar's hand cart (chapter 6 before the lift): crates → cart → crates → cart
const res = await ev(() => {
  const G = game, P0 = G.physics;
  setChapter('pass', {});
  G.enterRoom('hamalayi', null, true, true); G.story.refreshCast(); G.step(0.3); P.settle();
  const r = G.npcs.find((n) => n.def.id === 'lh_grum'), W = G.walkers; W.force = 0;
  const ti = r.stops.findIndex((s) => s.id === 'grum_cart'), s = r.stops[ti], prev = r.stops[(ti + r.stops.length - 1) % r.stops.length];
  const anim = r.actAnim(s), slot = { x: s.x, z: s.z };
  r.ri = (ti + r.stops.length - 1) % r.stops.length; r.slotAt(prev); r.arrived(prev, true); r.tmr = 0.3;
  const out = { anim, events: [], visits: [] };
  let v = null, t = 0, talked = false, lastPos = { x: r.pos.x, z: r.pos.z }, hop = 0;
  const hold = { x: G.hero.pos.x, z: G.hero.pos.z };
  heroBy(slot.x, slot.z, s.a + Math.PI + 0.9, 5.5); const hp = G.hero.pos.clone(), ha = G.hero.angle;
  for (let i = 0; i < 30 * 200 && out.visits.length < 2; i++) {
    G.step(1 / 30); G.scene.updateMatrixWorld(); t += 1 / 30; G.hero.pos.copy(hp); G.hero.angle = ha; if (G.state !== 'play') P.settle();
    { const d = Math.hypot(r.pos.x - lastPos.x, r.pos.z - lastPos.z); if (d > hop && i > 2) { hop = d; out.hopAt = `${r.st} at ${r.stop?.id} t ${t.toFixed(1)}`; } } lastPos = { x: r.pos.x, z: r.pos.z };
    const here = r.stop === s, dSlot = Math.hypot(r.pos.x - slot.x, r.pos.z - slot.z);
    if (here && r.st === 'dwell' && !v) v = { t0: +t.toFixed(1), stoodAtSlot: 0, stepped: 0, workFrames: 0, worstGap: 0, inCollider: 0, feet: 0, backTo: null, talk: null };
    if (v && here && r.st === 'dwell') {
      const K = r.wk, up = K && !K.go && !K.back && K.in > 0.01;
      if (!K && r.rig.anim === 'idle' && dSlot < 0.4) v.stoodAtSlot++;
      if (up) {
        v.stepped = +K.in.toFixed(2);
        if (r.rig.anim === anim && atContact(anim, r.rig.actionT) && !r.engaged) { v.workFrames++; v.worstGap = Math.max(v.worstGap, gapOf(r, anim)); if (!/^kneel/.test(anim)) v.feet = Math.max(v.feet, ...CT.feet(r).map(Math.abs)); }
        if (P0.blockedAt(r.pos.x, r.pos.z, r.pos.y, 0.2)) v.inCollider++;
        if (r.rig.standFor && !v.stoodUp) v.stoodUp = { why: r._wh?.why, t: +r.rig.actionT.toFixed(2) };
        // (the first visit: talked to while stepped up, for two seconds)
        if (!talked && (v.workFrames === 40 || (anim === 'setDown' && r.rig.actionT > 1.3))) { talked = true; r.engage(); const a0 = r.angle; for (let k = 0; k < 60; k++) { G.step(1 / 30); G.scene.updateMatrixWorld(); t += 1 / 30; G.hero.pos.copy(hp); } v.talk = { stoodStill: +Math.hypot(r.pos.x - K.x, r.pos.z - K.z).toFixed(2), turned: +Math.abs(Math.atan2(Math.sin(r.angle - a0), Math.cos(r.angle - a0))).toFixed(2), anim: r.rig.anim }; r.release(); }
      }
      if (K && K.back) v.backTo = +dSlot.toFixed(3);
    }
    if (v && !here) { v.leftFrom = +dSlot.toFixed(3); v.t1 = +t.toFixed(1); v.worstGap = +v.worstGap.toFixed(3); v.feet = +v.feet.toFixed(3); out.visits.push(v); v = null; }
  }
  out.t = +t.toFixed(0); out.biggestHop = +hop.toFixed(3); out.log = r.log.slice(-8); out.need = s._st?.need; W.force = null;
  return out;
});
const [v1, v2] = res.visits;
check('the resident reaches the cart twice on his round (crates → cart → crates → cart)', res.visits.length === 2, res);
if (v1 && v2) {
  check('first visit: stood down at the slot (nothing in reach), then a step up of under a metre', v1.stoodAtSlot > 0 && v1.stepped > 0.05 && v1.stepped <= 1.0, v1);
  check('stepped up he works with his hand on the cart (within 5 cm), feet on the ground, outside every collider', v1.workFrames > 3 && v1.worstGap <= 0.05 && v1.feet <= 0.06 && v1.inCollider === 0 && v2.worstGap <= 0.05 && v2.inCollider === 0, { v1, v2 });
  check('talked to while stepped up: he stays where he is and turns to the hero', v1.talk && v1.talk.stoodStill < 0.05 && v1.talk.turned > 0.3, v1.talk);
  check('he leaves from the slot (stepped back first), and the round goes on', v1.leftFrom < 0.06 && v2.leftFrom < 0.06, [v1.leftFrom, v2.leftFrom]);
  check('second visit: he steps up at once (no standing at the slot first)', v2.stoodAtSlot <= 2 && v2.stepped > 0.05 && res.need === true, v2);
  check('no jump: his biggest move in a frame is a walking step', res.biggestHop < 0.12, res.biggestHop);
}

// ---- one of the story's people: a villager in the monastery's yard (chapter 6, everybody up): mark → wheels → cart
const cast = await ev(() => {
  const G = game, P0 = G.physics;
  setChapter('pass', { c6_trip1: true, c6_trip2: true, c6_up: true, c6_thawed: true });
  G.story.refreshCast(); G.step(0.3); P.settle();
  const n = G.npcs.find((x) => x.def.id === 'lhar2'), R = G.story.interiors.rounds, m = n.placed;
  heroBy(m.x - 3.5, m.z + 0.5, 0.9, 6); const hp = G.hero.pos.clone(), ha = G.hero.angle;
  const out = { visits: [], mark: [+m.x.toFixed(1), +m.z.toFixed(1)] };
  let v = null, t = 0, lastPos = { x: n.pos.x, z: n.pos.z }, hop = 0, stopId = null;
  for (let i = 0; i < 30 * 260 && out.visits.length < 3; i++) {
    G.step(1 / 30); G.scene.updateMatrixWorld(); t += 1 / 30; G.hero.pos.copy(hp); G.hero.angle = ha; if (G.state !== 'play') P.settle();
    hop = Math.max(hop, Math.hypot(n.pos.x - lastPos.x, n.pos.z - lastPos.z)); lastPos = { x: n.pos.x, z: n.pos.z };
    const S = R.st.get('lhar2'); if (!S?.active) continue;
    const s = S.stops[S.ri];
    if (S.st === 'dwell' && !s.mark && !v) { v = { stop: s.id, act: s.act, stepped: 0, workFrames: 0, worstGap: 0, inCollider: 0, stood: 0 }; stopId = s.id; }
    if (v && S.st === 'dwell' && s.id === stopId) {
      const K = S.wk, up = K && !K.go && !K.back && K.in > 0.01;
      if (up) v.stepped = +K.in.toFixed(2);
      if (n.rig.anim === s.act && atContact(s.act, n.rig.actionT)) { v.workFrames++; v.worstGap = Math.max(v.worstGap, gapOf(n, s.act)); }
      if (n.rig.anim === 'idle' && !K) v.stood++;
      if (P0.blockedAt(n.pos.x, n.pos.z, n.pos.y, 0.2)) v.inCollider++;
    }
    if (v && (S.st !== 'dwell' || s.id !== stopId)) { v.leftFrom = +Math.hypot(n.pos.x - S.stops.find((q) => q.id === stopId).x, n.pos.z - S.stops.find((q) => q.id === stopId).z).toFixed(3); v.worstGap = +v.worstGap.toFixed(3); out.visits.push(v); v = null; }
  }
  out.t = +t.toFixed(0); out.biggestHop = +hop.toFixed(3); out.log = R.st.get('lhar2')?.log?.slice(-6);
  return out;
});
const cart = cast.visits.filter((v) => v.stop === 'cart'), wheels = cast.visits.filter((v) => v.stop === 'wheels');
check('the villager walks his round in the yard (the wheels and the cart reached)', cart.length >= 1 && wheels.length >= 1, cast);
check('at each he ends with a hand on the thing (within 5 cm; stepped up where the stop is out of reach), outside every collider', cast.visits.length > 0 && cast.visits.every((v) => v.workFrames > 0 && v.worstGap <= 0.05 && v.inCollider === 0), cast.visits);
check('he goes on from the stop itself (stepped back first); no jump', cast.visits.every((v) => v.leftFrom < 0.2) && cast.biggestHop < 0.12, { left: cast.visits.map((v) => v.leftFrom), hop: cast.biggestHop });
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
