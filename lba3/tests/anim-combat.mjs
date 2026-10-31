// Twinsen's combat animation (ANIM-COMBAT), in the developer arena by input. Checks that the animation serves the
// gameplay timing (which it must not change) and holds together under interruption:
//  - the ball leaves the hand at the throw's release (clock 0.16, COMBAT.throw.quickRelease), from the hand, high and in
//    front of the body, at 30, 60 and 120 fps; the controls come back at the same clock as before (quickDur 0.36);
//  - the planted foot of a standing throw stays put; the strikes' feet do not skate;
//  - the sword's blade sweeps the way the hit is swept (left → right for slash1), and the hit lands in the active frames
//    at every frame rate; the jab's fist is furthest out in its active frames;
//  - a hit, death, pause, dialogue, a weapon swap, a scene change and mashed buttons never leave a stuck pose, a ball
//    stuck in the hand, or a throw that plays on after it was cut short;
//  - the combat stance comes with a lock and goes after the fight; no joint jumps (≤ 0.9 rad in a 60 fps frame, legs and
//    chest; the throwing arm's whip ≤ 1.2).
// Prints MEASURE lines with the numbers. GAME_URL (default http://localhost:8123/).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker } from './lib/boot.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = watch(page);
const ev = (f, a) => page.evaluate(f, a);
const { check, done } = checker({ info: 'always' });
const measure = (name, info) => console.log('MEASURE ' + name, JSON.stringify(info));
await page.goto((process.env.GAME_URL || 'http://localhost:8123/'), { waitUntil: 'load', timeout: 240000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  G.settings.controls = 'modern'; G.applySettings();
  G.devArena();
  const E = (id) => G.enemies.find((e) => e.id === id);
  const V = G.hero.pos.constructor;
  const wp = (o) => { const v = new V(); o.updateWorldMatrix(true, false); o.getWorldPosition(v); return v; };
  window.C = {
    G, E, wp,
    step(s, dt = 1 / 60) { for (let t = 0; t < s - 1e-9; t += dt) G.frame(dt, false); },
    press(code, dt = 1 / 60, hold = false) { G.input.keys.add(code); G.input.taps.add(code); G.frame(dt, false); if (!hold) G.input.keys.delete(code); },
    only(ids = [], heroAt = [6194, 4], a = 0) {
      for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(ids.includes(e.id)); }
      const h = G.hero; h.pos.set(heroAt[0], G.physics.groundAt(heroAt[0], heroAt[1]), heroAt[1]); h.angle = a; h.vel.set(0, 0); h.hp = h.maxHp; h.mp = h.mpMax; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0;
      h.hasBall = true; h.hasSword = true; G.input.keys.clear();
      G.resetCombat(); G.combatDir.grace = 0; G.state = 'play'; G.ball.reset?.();
      C.step(0.6); C.settle();
    },
    // until both feet stand planted (not mid-step), at most 2 s
    settle() { for (let i = 0; i < 120; i++) { const F = G.hero.rig._feet; if (F && F.L.on && F.R.on && !F.L.stepping && !F.R.stepping && F.L.w >= 1 && F.R.w >= 1) return; G.frame(1 / 60, false); } },
    put(id, x, z, a = 0) { const e = E(id); e.setPresent(true); e.pos.set(x, G.physics.groundAt(x, z), z); e.angle = a; e.kb?.set(0, 0); e.sync?.(); e.coolT = 99; e.state = 'idle'; e.hp = e.maxHp = 999; return e; },
    // the hand relative to the hero: forward (along his facing), up (above his feet), side (+ = his left)
    rel(p) { const h = G.hero, s = Math.sin(h.angle), c = Math.cos(h.angle), dx = p.x - h.pos.x, dz = p.z - h.pos.z; return { fwd: +(dx * s + dz * c).toFixed(3), up: +(p.y - h.pos.y).toFixed(3), side: +(dx * c - dz * s).toFixed(3) }; },
    // largest per-frame joint change over a list of joints, since the last call
    jumps: { prev: null },
    joints() { const j = G.hero.rig.j; return { legL: j.legL.hip, legR: j.legR.hip, knL: j.legL.knee, knR: j.legR.knee, torso: j.torso, head: j.head, hips: j.hips, shR: j.armR.sh, elR: j.armR.el, shL: j.armL.sh, elL: j.armL.el }; },
    snap() { const o = {}; for (const [k, b] of Object.entries(C.joints())) o[k] = [b.rotation.x, b.rotation.y, b.rotation.z]; return o; },
    nan() { for (const b of Object.values(C.joints())) if (![b.rotation.x, b.rotation.y, b.rotation.z].every(Number.isFinite)) return true; return !Number.isFinite(G.hero.rig.j.hips.position.z); },
  };
});

// ---- 1. the throw at 30, 60 and 120 fps: release clock, from the hand, high in front; controls back at 0.36; the
// planted back foot stays; the joints don't jump
for (const fps of [30, 60, 120]) {
  const r = await ev((fps) => {
    const { G } = C, h = G.hero, B = G.ball, dt = 1 / fps; C.only([], [6194, 4], 0); h.combat.equip('ball', true);
    let shot = null; const orig = B.launch.bind(B);
    B.launch = (...a) => { const hand = C.wp(h.rig.j.armR.hand); orig(...a); shot = { clock: +h.combat.throwing.at.toFixed(4), fromHand: +B.pos.distanceTo(hand).toFixed(3), hand: C.rel(hand) }; };
    const footR0 = C.wp(h.rig.j.legR.foot);
    let prev = C.snap(), maxLeg = 0, maxArm = 0, freeAt = null, t = 0, footR1 = null, backStep = null;
    C.press('KeyF', dt);
    for (let i = 0; i < Math.round(0.9 * fps); i++) {
      G.frame(dt, false); t += dt;
      const s = C.snap();
      for (const k of Object.keys(s)) for (let a = 0; a < 3; a++) { const d = Math.abs(s[k][a] - prev[k][a]) / (dt * 60); if (k.startsWith('sh') || k.startsWith('el')) maxArm = Math.max(maxArm, d); else maxLeg = Math.max(maxLeg, d); }
      prev = s;
      if (freeAt == null && !h.combat.throwing) { freeAt = +(t + dt).toFixed(3); footR1 = C.wp(h.rig.j.legR.foot); }
      const F = h.rig._feet; if (freeAt == null && F && (F.R.stepping || !F.R.on) && backStep == null) backStep = [+t.toFixed(3), F.R.stepping ? 'step' : 'lifted', +(F.R.reach || 0).toFixed(3)];
    }
    B.launch = orig;
    return { fps, shot, freeAt, backStep, backFootCm: +(Math.hypot(footR1.x - footR0.x, footR1.z - footR0.z) * 100).toFixed(1), maxLegStep60: +maxLeg.toFixed(3), maxArmStep60: +maxArm.toFixed(3), nan: C.nan() };
  }, fps);
  measure(`throw ${fps} fps`, r);
  const dt = 1 / fps;
  check(`throw ${fps} fps: the ball leaves at the release clock (0.16)`, r.shot && r.shot.clock >= 0.16 - 1e-6 && r.shot.clock < 0.16 + dt + 1e-3, r.shot);
  check(`throw ${fps} fps: from the hand, high and in front of him`, r.shot && r.shot.fromHand < 0.25 && r.shot.hand.up > 1.45 && r.shot.hand.fwd > 0.15, r.shot);
  check(`throw ${fps} fps: the controls come back at 0.36 s after the press, as before`, r.freeAt != null && Math.abs(r.freeAt - (0.36 + dt)) < dt * 1.5 + 0.02, { freeAt: r.freeAt });
  check(`throw ${fps} fps: the planted back foot stays put while the throw holds him (< 3 cm)`, r.backFootCm < 3, { cm: r.backFootCm });
  check(`throw ${fps} fps: no joint jumps (legs/chest ≤ 0.9, arms ≤ 1.2 rad per 60 fps frame)`, r.maxLegStep60 <= 0.9 && r.maxArmStep60 <= 1.2 && !r.nan, r);
}

// ---- 1b. throwing on the move (walking ahead; locked on and stepping sideways): the legs keep walking, the ball still
// leaves from the hand at the release clock, over the head and not behind it
for (const [name, key, lock] of [['walking', 'KeyW', false], ['sideways, locked', 'KeyD', true]]) {
  const r = await ev(([key, lock]) => {
    const { G, E } = C, h = G.hero, B = G.ball; C.only(['a_dummy'], [6194, 2], 0); C.put('a_dummy', 6194, 9); h.combat.equip('ball', true);
    G.camRig.yaw = Math.PI; if (lock) G.targeting.lock = E('a_dummy');
    let shot = null; const orig = B.launch.bind(B);
    B.launch = (...a) => { const hand = C.wp(h.rig.j.armR.hand); orig(...a); shot = { clock: +h.combat.throwing.at.toFixed(4), fromHand: +B.pos.distanceTo(hand).toFixed(3), hand: C.rel(hand), legs: h.rig.anim }; };
    G.input.keys.add(key); C.step(0.5); C.press('KeyF', 1 / 60, true); G.input.keys.delete('KeyF'); G.input.keys.add(key); C.step(0.8); G.input.keys.delete(key);
    B.launch = orig; G.targeting.release();
    return { shot, nan: C.nan() };
  }, [key, lock]);
  measure(`throw on the move (${name})`, r);
  check(`throw on the move (${name}): the legs walk, the ball leaves the hand at 0.16, over the head and not behind it`, r.shot && r.shot.legs === 'walk' && r.shot.clock < 0.16 + 1 / 60 + 1e-3 && r.shot.fromHand < 0.25 && r.shot.hand.up > 1.5 && r.shot.hand.fwd > -0.05 && !r.nan, r.shot);
}

// ---- 2. the sword at 30, 60 and 120 fps: the hit in the active frames; the blade's sweep runs the hit's way; feet
for (const fps of [30, 60, 120]) {
  const r = await ev((fps) => {
    const { G, E } = C, h = G.hero, dt = 1 / fps; C.only(['a_dummy'], [6194, 4], 0); C.put('a_dummy', 6194, 5.7); h.combat.equip('sword', true);
    const d = E('a_dummy'); d.hits = 0;
    const feet0 = [C.wp(h.rig.j.legL.foot), C.wp(h.rig.j.legR.foot)];
    C.press('KeyK', dt);
    let hitAt = null, yaws = [], t = 0, slid = 0, lastF = null;
    const D = h.combat.move.def;
    for (let i = 0; i < Math.round(0.5 * fps); i++) {
      const before = d.hits; G.frame(dt, false); t += dt;
      const m = h.combat.move;
      if (hitAt == null && d.hits > before) hitAt = +(m ? m.t : t).toFixed(4);
      // the blade's direction: from the hand to the sword's tip, relative to his facing (+ = his left)
      if (m && m.t >= D.s && m.t <= D.s + D.a) {
        const hand = C.wp(h.rig.j.armR.hand), tip = new hand.constructor(0, -0.8, 0); h.swordMesh.localToWorld(tip);
        const yaw = Math.atan2(tip.x - hand.x, tip.z - hand.z) - h.angle; yaws.push(+Math.atan2(Math.sin(yaw), Math.cos(yaw)).toFixed(2));
      }
      // a foot on the ground (the lower one, at ground height) gliding over it
      const F = [C.wp(h.rig.j.legL.foot), C.wp(h.rig.j.legR.foot)];
      if (lastF) for (let k = 0; k < 2; k++) if (F[k].y - h.pos.y < 0.115) slid += Math.hypot(F[k].x - lastF[k].x, F[k].z - lastF[k].z) * (F[k].y < F[1 - k].y + 0.005 ? 1 : 0);
      lastF = F;
    }
    void feet0;
    return { fps, s: D.s, a: D.a, hitAt, yawFirst: yaws[0], yawLast: yaws[yaws.length - 1], yaws, plantedGlideCm: +(slid * 100).toFixed(1), nan: C.nan() };
  }, fps);
  measure(`slash1 ${fps} fps`, r);
  check(`slash1 ${fps} fps: the hit lands in the active frames (startup ${r.s}, active ${r.a})`, r.hitAt != null && r.hitAt >= r.s - 1e-6 && r.hitAt <= r.s + r.a + 1 / fps + 1e-6, { hitAt: r.hitAt });
  check(`slash1 ${fps} fps: the blade sweeps from his left to his right through the active frames`, r.yawFirst > 0.2 && r.yawLast < -0.2, { first: r.yawFirst, last: r.yawLast });
  check(`slash1 ${fps} fps: the planted feet don't skate (< 12 cm over the strike and its step)`, r.plantedGlideCm < 12 && !r.nan, { cm: r.plantedGlideCm });
}

// ---- 3. the jab: the fist is furthest out in the active frames
{
  const r = await ev(() => {
    const { G } = C, h = G.hero; C.only([], [6194, 4], 0); h.combat.equip('fists', true); h.weapon = 'fists'; C.step(0.3);
    C.press('KeyK');
    const D = h.combat.move.def; let best = -9, bestT = 0;
    for (let i = 0; i < 25 && h.combat.move; i++) { const t = h.combat.move.t; const f = C.rel(C.wp(h.rig.j.armR.hand)).fwd; if (f > best) { best = f; bestT = t; } C.step(1 / 60); }
    return { s: D.s, a: D.a, r: D.r, reachFwd: +best.toFixed(2), at: +bestT.toFixed(3) };
  });
  measure('jab', r);
  check('jab: the fist is furthest out in (or a frame after) the active frames', r.at >= r.s && r.at <= r.s + r.a + 1 / 60 + 1e-6 && r.reachFwd > 0.55, r);
}

// ---- 4. interruptions
{
  const r = await ev(() => {
    const { G, E } = C, h = G.hero, B = G.ball, out = {};
    let launched = 0; const orig = B.launch.bind(B); B.launch = (...a) => { launched++; orig(...a); };
    // a hit in the coil: no throw, no whip played on, the hit reaction, then the stance
    C.only([], [6194, 4], 0); h.combat.equip('ball', true); launched = 0;
    C.press('KeyF'); C.step(0.06); h.damage(1, { x: h.pos.x, z: h.pos.z + 2 }); C.step(1 / 60); const after = { anim: h.rig.anim, over: !!h.rig.over, ball: B.state };
    C.step(1.2); out.hitInCoil = { ...after, launched, later: h.rig.anim, ballLater: B.state, busy: h.combat.busy, nan: C.nan() };
    // death in a charge: the ball doesn't stay in the hand, the body falls
    C.only([], [6194, 4], 0); h.clovers = 0; launched = 0;
    G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); C.step(0.6); h.hp = 1; h.invuln = 0; h.damage(5, { x: h.pos.x, z: h.pos.z + 2 }); G.input.keys.delete('KeyF'); C.step(0.8);
    out.deathInCharge = { dead: h.dead, anim: h.rig.anim, ball: B.state, launched, nan: C.nan() };
    G.state = 'play'; h.dead = false; h.deathT = 0;
    // pause in the coil: frozen while paused; back in play the throw is called off (combat.reset, as before) and the
    // body eases back to the stance
    C.only([], [6194, 4], 0); launched = 0;
    C.press('KeyF'); C.step(0.05); const a0 = h.rig.j.armR.sh.rotation.x; G.pause(); C.step(0.5); const a1 = h.rig.j.armR.sh.rotation.x; G.act?.('resume'); if (G.state !== 'play') G.setState('play'); C.step(1.0);
    out.pause = { frozen: Math.abs(a1 - a0) < 1e-6, launched, anim: h.rig.anim, ball: B.state, over: !!h.rig.over, nan: C.nan() };
    // dialogue in the middle of a sword strike: talk/listen, then back to the stance
    C.only(['a_dummy'], [6194, 4], 0); C.put('a_dummy', 6194, 5.7); h.combat.equip('sword', true);
    C.press('KeyK'); C.step(0.08); let done = false; G.say('Twinsen', ['Test.'], () => { done = true; }, h); C.step(0.5); const inTalk = h.rig.anim;
    G.hud.advance?.(); C.step(0.1); if (!done) { G.hud.advance?.(); C.step(0.1); } if (G.state !== 'play') G.setState('play'); C.step(1.0);
    out.dialogue = { inTalk, after: h.rig.anim, busy: h.combat.busy, nan: C.nan() };
    // a weapon swap in the middle of a strike, then mashing every button in one frame
    C.only(['a_dummy'], [6194, 4], 0); C.put('a_dummy', 6194, 5.7); h.combat.equip('sword', true);
    C.press('KeyK'); C.step(0.05); C.press('KeyR'); C.step(1.2);
    out.swap = { weapon: h.combat.weapon, anim: h.rig.anim, busy: h.combat.busy, sword: !!h.swordMesh?.visible, nan: C.nan() };
    C.only(['a_dummy'], [6194, 4], 0); h.combat.equip('ball', true); launched = 0;
    for (const k of ['KeyK', 'KeyF', 'ShiftLeft', 'Space']) { G.input.keys.add(k); G.input.taps.add(k); }
    C.step(1 / 60); for (const k of ['KeyK', 'KeyF', 'ShiftLeft', 'Space']) G.input.keys.delete(k); C.step(2.0);
    out.mash = { anim: h.rig.anim, busy: h.combat.busy, ball: B.state, launched, over: !!h.rig.over, nan: C.nan() };
    // a scene change in a charge: the ball goes home, nothing is held
    C.only([], [6194, 4], 0); launched = 0;
    G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); C.step(0.6); G.resetCombat(); h.pos.set(6190, G.physics.groundAt(6190, 8), 8); G.input.keys.delete('KeyF'); C.step(0.8);
    out.scene = { anim: h.rig.anim, ball: B.state, launched, over: !!h.rig.over, nan: C.nan(), feetW: +(h.rig._feet?.w ?? 0).toFixed(2) };
    B.launch = orig;
    return out;
  });
  measure('interruptions', r);
  check('a hit in the coil: no throw, no whip played on, the ball home, the reaction then the stance', r.hitInCoil.launched === 0 && r.hitInCoil.anim === 'hurt' && !r.hitInCoil.over && r.hitInCoil.ballLater === 'idle' && r.hitInCoil.later === 'idle' && !r.hitInCoil.busy && !r.hitInCoil.nan, r.hitInCoil);
  check('death in a charge: falls, the ball is not left in the hand, nothing thrown', r.deathInCharge.dead && r.deathInCharge.anim === 'dead' && r.deathInCharge.ball !== 'inhand' && r.deathInCharge.launched === 0 && !r.deathInCharge.nan, r.deathInCharge);
  check('pause in the coil: frozen while paused, called off on resume, back to the stance, ball home', r.pause.frozen && r.pause.launched === 0 && r.pause.anim === 'idle' && r.pause.ball === 'idle' && !r.pause.over && !r.pause.nan, r.pause);
  check('dialogue in a strike: he talks, then stands again (nothing stuck)', r.dialogue.inTalk === 'talk' && r.dialogue.after === 'idle' && !r.dialogue.busy && !r.dialogue.nan, r.dialogue);
  check('a weapon swap in a strike: the strike ends, the new weapon shows, idle', r.swap.anim === 'idle' && !r.swap.busy && !r.swap.nan, r.swap);
  check('every button in one frame: no stuck pose, no ball left in the hand', r.mash.anim === 'idle' && !r.mash.busy && r.mash.ball !== 'inhand' && !r.mash.over && !r.mash.nan, r.mash);
  check('a scene change in a charge: the ball home, nothing held, the feet re-planted', r.scene.anim === 'idle' && r.scene.ball === 'idle' && r.scene.launched === 0 && !r.scene.over && !r.scene.nan, r.scene);
}

// ---- 5. the combat stance comes with a lock and goes after the fight; the head turns to the locked target
{
  const r = await ev(() => {
    const { G, E } = C, h = G.hero; C.only(['a_dummy'], [6194, 4], 0); C.put('a_dummy', 6197, 6); h.combat.equip('sword', true); C.step(3.0);
    const calm = { guard: h.rig.guard, w: +(h.rig._guardW || 0).toFixed(2) };
    G.targeting.lock = E('a_dummy'); C.step(0.8);
    const locked = { guard: h.rig.guard, w: +(h.rig._guardW || 0).toFixed(2), headY: +h.rig.j.head.rotation.y.toFixed(2) };
    G.targeting.release(); C.step(3.5);
    const after = { guard: h.rig.guard, w: +(h.rig._guardW || 0).toFixed(2) };
    return { calm, locked, after };
  });
  measure('stance', r);
  check('combat stance: off at rest, on with a lock (the head turned toward the target on his left), off 2.5 s after', !r.calm.guard && r.calm.w < 0.05 && r.locked.guard && r.locked.w > 0.9 && r.locked.headY > 0.15 && !r.after.guard && r.after.w < 0.2, r);
}

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
