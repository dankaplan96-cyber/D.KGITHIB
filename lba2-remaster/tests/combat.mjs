// Combat systems test, in the developer arena (?arena / game.devArena()). Each check prints PASS/FAIL with
// the measured values. Covers: input buffer and combo, active-frame timing and single hits, walls blocking
// melee and targeting, the dodge's invulnerability, the ball at low frame rates (no tunnelling), recall,
// scene changes, presses during dialogue, lock-on, the sentry's shield and guard break, the crawler's slam,
// the ball switch, weapon save/load, dodge distance at 30 vs 60 fps, and the ball's LBA2 rules (magic, bounces, fetch).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, JSON.stringify(info)); };
await page.goto((process.env.GAME_URL || 'http://localhost:8123/'), { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  G.settings.controls = 'modern'; G.applySettings(); // (these checks are of the modern scheme; Classic: §19)
  G.devArena();
  const E = (id) => G.enemies.find((e) => e.id === id);
  window.C = {
    G, E,
    step(s, dt = 1 / 60) { for (let t = 0; t < s - 1e-9; t += dt) G.frame(dt, false); },
    press(code, hold = 0) { G.input.keys.add(code); G.input.taps.add(code); C.step(1 / 60); if (!hold) G.input.keys.delete(code); },
    release(code) { G.input.keys.delete(code); },
    // park every enemy far away except the ones named, and reset the hero
    only(ids = [], heroAt = [6194, 8], a = 0) {
      for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; const on = ids.includes(e.id); e.setPresent(on); }
      const h = G.hero; h.pos.set(heroAt[0], G.physics.groundAt(heroAt[0], heroAt[1]), heroAt[1]); h.angle = a; h.vel.set(0, 0); h.hp = h.maxHp; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0;
      G.resetCombat(); G.combatDir.grace = 0; G.state = 'play';
    },
    put(id, x, z, a = 0) { const e = E(id); e.pos.set(x, G.physics.groundAt(x, z), z); e.angle = a; e.kb?.set(0, 0); e.sync?.(); return e; },
  };
});

// 1. sword: hit only in the active frames, exactly once; combo continues from a buffered press
let r = await ev(() => {
  const { G, E } = C; C.only(['a_dummy'], [6194, 4], 0); C.put('a_dummy', 6194, 5.5);
  const d = E('a_dummy'); d.hits = 0; G.hero.combat.equip('sword', true);
  C.press('KeyK'); const startup = []; for (let i = 0; i < 6; i++) { C.step(1 / 60); startup.push(d.hits); }
  C.step(0.25); const afterFirst = d.hits;
  // press again in the second half of recovery → the next strike of the combo
  const combo0 = G.hero.combat.combo; C.press('KeyK'); C.step(0.5);
  return { startupHits: startup, afterFirst, combo0, combo1: G.hero.combat.combo, total: d.hits, anim: G.hero.rig.anim };
});
check('sword: no damage before the active frames', r.startupHits[3] === 0, r);
check('sword: one hit per swing', r.afterFirst === 1, r);
check('sword: buffered press continues the combo', r.combo1 === 1 && r.total === 2, r);

// 2. a press during a long startup does not queue a chain of attacks
r = await ev(() => {
  const { G, E } = C; C.only(['a_dummy'], [6194, 4], 0); C.put('a_dummy', 6194, 5.5); const d = E('a_dummy'); d.hits = 0;
  for (let i = 0; i < 6; i++) { C.press('KeyK'); C.step(0.02); }
  C.step(2.0);
  return { hits: d.hits, busy: G.hero.combat.busy };
});
check('mashing does not chain more than the combo allows', r.hits <= 3 && !r.busy, r);

// 3. melee never reaches through a wall; targeting ignores enemies behind walls
r = await ev(() => {
  const { G, E } = C; C.only(['a_mite'], [6198, 3.3], Math.PI);  // the wall runs x 6195..6201 at z = 2 (0.4 thick)
  const m = C.put('a_mite', 6198, 1.0); m.state = 'idle'; m.hp = m.maxHp = 50; m.coolT = 99;
  G.hero.combat.equip('sword', true);
  C.press('KeyK'); C.step(0.6);
  const picked = G.targeting.pick({ x: 0, z: -1 }, 9, 0.6);
  return { hp: m.hp, picked: picked?.id || null };
});
check('sword blocked by the wall', r.hp === 50, r);
check('targeting skips enemies behind walls', r.picked === null, r);

// 4. the dodge: invulnerable in its window, not outside it; moves about its distance
r = await ev(() => {
  const { G } = C; C.only([], [6190, 6], 0); const h = G.hero;
  const x0 = h.pos.x; G.input.keys.add('KeyD'); C.press('ShiftLeft'); C.step(0.06);
  h.damage(1, null); const hpIn = h.hp;
  C.step(0.5); G.input.keys.delete('KeyD');
  h.invuln = 0; h.damage(1, null); const hpOut = h.hp;
  return { hpIn, hpOut, moved: +Math.hypot(h.pos.x - x0, 0).toFixed(2), max: h.maxHp };
});
check('dodge: hit during the hop misses', r.hpIn === r.max, r);
check('dodge: hit after it lands', r.hpOut < r.max, r);

// 5. the ball at 15 fps does not pass through the wall; it comes back and is ready again
r = await ev(() => {
  const { G } = C; C.only([], [6198, 7], Math.PI); G.hero.combat.equip('ball', true);
  G.input.mouse.inside = false;
  // Aggressive: the flat, fast throw (19 m/s → 1.3 m per frame at 15 fps); the wall is 0.4 m thick, 2.2 m high
  G.hero.behaviour = 'aggressive';
  C.press('KeyF'); let minZ = 99, crossed = false, prev = null;
  for (let i = 0; i < 40; i++) { C.step(1 / 15, 1 / 15); const b = G.ball; if (b.state === 'fly') { minZ = Math.min(minZ, b.pos.z); if (prev && prev.z > 2.2 && b.pos.z < 1.8 && Math.min(prev.y, b.pos.y) < 2.2 + 0.14) crossed = true; prev = b.pos.clone(); } }
  G.hero.behaviour = 'normal';
  C.step(3);
  return { minZ: +minZ.toFixed(2), crossed, state: G.ball.state };
});
check('ball: no tunnelling through a thin wall at 15 fps', !r.crossed, r);
check('ball: back in hand afterwards', r.state === 'idle', r);

// 6. one press, one ball; pressing again while it flies calls it back
r = await ev(() => {
  const { G } = C; C.only([], [6190, 8], Math.PI / 2);
  C.press('KeyF'); C.step(0.1); C.press('KeyF'); const st1 = G.ball.state;
  C.step(0.25); C.press('KeyF'); const st2 = G.ball.state;
  C.step(3); return { st1, st2, end: G.ball.state };
});
check('ball: a second press before 0.2 s does not recall or duplicate', r.st1 === 'fly' || r.st1 === 'inhand', r);
check('ball: recall', r.st2 === 'return' && r.end === 'idle', r);

// 7. scene change while the ball flies → the ball is home, combat state reset
r = await ev(() => {
  const { G } = C; C.only([], [6190, 8], Math.PI / 2);
  C.press('KeyF'); C.step(0.3); const flying = G.ball.state;
  G.enterRoom('house', null, true); const after = G.ball.state, busy = G.hero.combat.busy;
  G.devArena(); return { flying, after, busy };
});
check('scene change returns the ball and clears combat', r.flying === 'fly' && r.after === 'idle' && !r.busy, r);

// 8. a press made during dialogue does not fire when it closes
r = await ev(() => {
  const { G, E } = C; C.only(['a_dummy'], [6194, 4], 0); C.put('a_dummy', 6194, 5.5); const d = E('a_dummy'); d.hits = 0;
  G.hero.combat.equip('sword', true);
  G.say('', ['Test line.'], () => {});
  C.press('KeyK'); C.step(0.1);
  G.input.taps.add('KeyE'); C.step(0.05); for (let i = 0; i < 40 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); C.step(0.05); }
  C.step(0.6);
  return { state: G.state, hits: d.hits, busy: G.hero.combat.busy };
});
check('no attack fires after dialogue closes', r.state === 'play' && r.hits === 0, r);

// 9. lock-on: takes the visible target, lets go when it dies
r = await ev(() => {
  const { G, E } = C; C.only(['a_mite'], [6190, -6], Math.PI / 2); const m = C.put('a_mite', 6194, -6); m.state = 'idle'; m.hp = 1; m.coolT = 99;
  C.press('KeyL'); C.step(0.1); const locked = G.targeting.lock?.id;
  m.damage(5, G.hero.pos); C.step(0.1);
  return { locked, after: G.targeting.lock?.id || null };
});
check('lock-on picks the target and releases it on defeat', r.locked === 'a_mite' && r.after === null, r);

// 10. the sentry: blocks a frontal slash, a heavy strike breaks its guard, a hit from behind lands
r = await ev(() => {
  const { G, E } = C; C.only(['a_sentry'], [6192, -2], -Math.PI / 2); const s = C.put('a_sentry', 6190.4, -2, Math.PI / 2);
  s.state = 'chase'; s.hp = s.maxHp = 30; s.coolT = 99; G.hero.combat.equip('sword', true);
  C.press('KeyK'); C.step(0.5); const hpBlock = s.hp, st1 = s.state;
  C.only(['a_sentry'], [6192, -2], -Math.PI / 2); C.put('a_sentry', 6190.4, -2, Math.PI / 2); s.coolT = 99;
  // heavy: hold the button through the first strike, release
  s.state = 'chase'; G.input.keys.add('KeyK'); G.input.taps.add('KeyK'); C.step(1.0); G.input.keys.delete('KeyK'); C.step(0.8);
  const st2 = s.state, hpHeavy = s.hp;
  return { hpBlock, st1, st2, hpHeavy, d: +G.hero.distTo(s).toFixed(2), anim: G.hero.rig.anim, holding: G.hero.combat.holding };
});
check('sentry blocks a frontal slash', r.hpBlock === 30, r);
check('heavy strike breaks the guard', r.hpHeavy < 30 && (r.st2 === 'stagger' || r.st2 === 'chase'), r);

// 11. the crawler's slam: hurts inside its ring, missed with a dodge
r = await ev(() => {
  const { G, E } = C; C.only(['a_crawler'], [6200, -5], Math.PI); const c = C.put('a_crawler', 6200, -7.5, 0);
  c.state = 'windup'; c.stateT = 0; c.hp = 50; const h = G.hero; const hp0 = h.hp;
  C.step(1.4); const hit = h.hp < hp0;
  C.only(['a_crawler'], [6200, -5], Math.PI); C.put('a_crawler', 6200, -7.5, 0); c.state = 'windup'; c.stateT = 0; c.coolT = 0;
  C.step(0.85); G.input.keys.add('KeyS'); C.press('ShiftLeft'); C.step(0.6); G.input.keys.delete('KeyS');
  return { hit, dodgedHp: h.hp, max: h.maxHp };
});
check('crawler slam hurts inside the ring', r.hit, r);
check('crawler slam dodged', r.dodgedHp === r.max, r);

// 12. the ball switch opens the gate (aimed by the assist)
r = await ev(() => {
  const { G } = C; C.only([], [6186.5, -9.5], Math.PI); const R = G.rooms.arena; R.gate.set(false); R.ballTargets[0].done = false;
  G.hero.combat.equip('ball', true);
  G.hero.angle = Math.atan2(R.ballTargets[0].x - G.hero.pos.x, R.ballTargets[0].z - G.hero.pos.z);
  C.press('KeyF'); C.step(2);
  return { open: R.gate.open };
});
check('ball switch opens the gate', r.open, r);

// 13. weapons survive save / load (no duplicates, the equipped one kept)
r = await ev(() => {
  const { G } = C; const h = G.hero; h.hasSword = true; h.hasPulse = false; h.weapon = 'sword'; h.prevWeapon = 'ball';
  const snap = G.snapshot(); h.hasSword = false; h.weapon = 'fists';
  snap.room = null; G.applySave(snap);
  return { hasSword: h.hasSword, hasPulse: h.hasPulse, weapon: h.weapon, prev: h.prevWeapon, owned: h.combat.owned() };
});
check('weapons saved and restored', r.hasSword && !r.hasPulse && r.weapon === 'sword' && r.owned.join() === 'ball,sword,fists', r);

// 14. frame-rate independence of the dodge
r = await ev(() => {
  const { G } = C; G.devArena(); const out = [];
  for (const dt of [1 / 30, 1 / 60]) {
    C.only([], [6190, 6], 0); const h = G.hero; const x0 = h.pos.x;
    G.input.keys.add('KeyD'); G.input.keys.add('ShiftLeft'); G.input.taps.add('ShiftLeft'); C.step(dt, dt); G.input.keys.delete('ShiftLeft'); G.input.keys.delete('KeyD');
    C.step(0.5, dt); out.push(+Math.abs(h.pos.x - x0).toFixed(2)); C.step(1.0, dt);
  }
  return { d30: out[0], d60: out[1] };
});
check('dodge distance consistent at 30 and 60 fps', Math.abs(r.d30 - r.d60) < 0.35 && r.d60 > 2, r);

// 15. the ball: tap or hold, decided by the button that started it, the same at 30, 60 and 120 fps
r = await ev(() => {
  const { G } = C, out = {};
  const B = G.ball, orig = B.launch.bind(B);
  let shot = null, t = 0;
  B.launch = (...a) => { shot = { t: +t.toFixed(3), charged: !!a[3]?.charged }; return orig(...a); };
  const frames = (s, dt) => { for (let i = 0, n = Math.round(s / dt); i < n; i++) { G.frame(dt, false); t += dt; } };
  const fresh = () => { C.only([], [6190, 8], Math.PI / 2); G.hero.combat.equip('fists', true); G.hero.mp = 3; G.ball.reset?.(); C.step(0.5); shot = null; t = 0; };
  const hold = (code, dt) => { G.input.keys.add(code); G.input.taps.add(code); frames(dt, dt); };
  for (const [name, dt] of [['f30', 1 / 30], ['f60', 1 / 60], ['f120', 1 / 120]]) {
    const o = out[name] = {};
    // a full hold: nothing leaves the hand while held; charging starts; the release throws the charged ball
    fresh(); hold('KeyF', dt); frames(1.0, dt);
    o.holdEarly = shot; o.charging = !!G.hero.combat.throwing?.charging;
    G.input.keys.delete('KeyF'); frames(0.3, dt); o.holdShot = shot; o.mp = G.hero.mp;
    // a tap: the quick throw on the animation's release
    fresh(); hold('KeyF', dt); G.input.keys.delete('KeyF'); frames(0.6, dt); o.tap = shot;
    // a short hold (released before charging): a quick throw, soon after the release
    fresh(); hold('KeyF', dt); frames(0.18 - dt, dt); G.input.keys.delete('KeyF'); const rel = t; frames(0.6, dt); o.short = shot; o.shortLag = shot && +(shot.t - rel).toFixed(3);
    // release and press again: no charge from the second press
    fresh(); hold('KeyF', dt); frames(0.05, dt); G.input.keys.delete('KeyF'); frames(dt, dt); G.input.keys.add('KeyF'); frames(0.6, dt); G.input.keys.delete('KeyF'); o.repress = shot;
    // another button held (attack) does not hold a throw started with the ball key
    fresh(); hold('KeyF', dt); G.input.keys.delete('KeyF'); G.input.keys.add('KeyK'); frames(0.6, dt); G.input.keys.delete('KeyK'); o.other = shot;
    C.step(3);
  }
  B.launch = orig;
  return out;
});
for (const [k, o] of Object.entries(r)) {
  check(`ball (${k}): a held press never throws before charging; release throws charged`, !o.holdEarly && o.charging && o.holdShot?.charged && o.mp < 2.9, o); // (one point spent; magic regenerates meanwhile)
  check(`ball (${k}): tap throws quick at the release frame`, o.tap && !o.tap.charged && o.tap.t >= 0.15 && o.tap.t <= 0.2, o.tap);
  check(`ball (${k}): short hold throws quick right after the release`, o.short && !o.short.charged && o.shortLag <= 0.07, { short: o.short, lag: o.shortLag });
  check(`ball (${k}): release + press again does not charge`, o.repress && !o.repress.charged && o.repress.t < 0.3, o.repress);
  check(`ball (${k}): a held attack button does not hold the ball key's throw`, o.other && !o.other.charged && o.other.t < 0.25, o.other);
}

// 16. holding the ball: a slow aimed walk; without a mouse the direction is also the aim; the release throws that way
r = await ev(() => {
  const { G } = C, h = G.hero, B = G.ball, orig = B.launch.bind(B); let shot = null;
  C.only([], [6190, 8], 0); h.combat.equip('fists', true); h.mp = 3; G.input.mouse.inside = false; C.step(0.3);
  B.launch = (...a) => { shot = { aim: a[3]?.aim }; return orig(...a); };
  const p0 = h.pos.clone(), a0 = h.angle;
  G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); C.step(0.4);
  G.input.keys.add('KeyD'); C.step(0.8);
  const moved = h.pos.distanceTo(p0), turned = Math.abs(h.angle - a0);
  G.input.keys.delete('KeyF'); C.step(0.1); G.input.keys.delete('KeyD'); C.step(2);
  B.launch = orig;
  const yaw = G.camRig.yaw, right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  const dot = shot ? (shot.aim.x * right.x + shot.aim.z * right.z) / Math.hypot(shot.aim.x, shot.aim.z) : -1;
  return { moved: +moved.toFixed(3), turned: +turned.toFixed(2), thrown: !!shot, alongRight: +dot.toFixed(2) };
});
check('charging: a slow controlled walk (not frozen, not full speed), the direction turns the aim', r.moved > 0.2 && r.moved < 1.2 && r.turned > 0.5, r);
check('...and the release throws where he aims', r.thrown && r.alongRight > 0.8, r);

// 17. the ball as in LBA2: a throw costs 1 magic; with magic 4 bounces and home on the 5th contact, without
//     magic home at the first; a bonus it touches rides back with it
r = await ev(() => {
  const { G } = C, h = G.hero, B = G.ball;
  const run = (mp) => {
    C.only([], [6190, 8], Math.PI / 2); G.hero.combat.equip('ball', true); B.reset(); C.step(0.2);
    h.mp = mp; let contacts = 0; const ob = B.bounce.bind(B); B.bounce = (k) => { contacts++; ob(k); };
    B.launch(h, 'normal', h.magicLevel, { aim: { x: 1, z: 0 } }); const mpAfter = h.mp;
    let returned = 0; for (let i = 0; i < 600 && B.state !== 'idle'; i++) { if (B.state === 'return' && !returned) returned = contacts; C.step(1 / 60); }
    B.bounce = ob;
    return { mp: +mpAfter.toFixed(2), contacts: returned, end: B.state };
  };
  const dry = run(0), wet = run(5);
  // fetch: a coin placed on the ball's path comes back with it
  C.only([], [6190, 8], Math.PI / 2); B.reset(); C.step(0.2); h.mp = 0;
  B.launch(h, 'normal', h.magicLevel, { aim: { x: 1, z: 0 } }); C.step(0.15);
  const coins0 = h.coins, p = G.pickups.spawn('coin', B.pos.x + B.vel.x * 0.05, B.pos.y + B.vel.y * 0.05, B.pos.z, { value: 1 });
  let carried = false; for (let i = 0; i < 400 && B.state !== 'idle'; i++) { C.step(1 / 60); carried ||= !!p.carried; }
  return { dry, wet, carried, coins: h.coins - coins0, left: G.pickups.list.includes(p), color: '#' + B.mat.color.getHexString() };
});
check('ball without magic: home at the first contact, nothing spent', r.dry.contacts === 1 && r.dry.mp === 0 && r.dry.end === 'idle', r.dry);
check('ball with magic: 1 point spent, 4 bounces, home on the 5th contact', r.wet.contacts === 5 && r.wet.mp === 4 && r.wet.end === 'idle', r.wet);
check('ball fetches a bonus it touches', r.carried && r.coins === 1 && !r.left, r);

// 18. aiming with the mouse: a still cursor stays the aim; walking sideways never redirects the throw; a camera
//     drag never toggles the lock (a right tap does); Aim Assist Off picks nothing; the ball leaves the hand at
//     the release frame; the follow-through blends into the walk
r = await ev(() => {
  const { G, E } = C, h = G.hero, B = G.ball, I = G.input, M = I.mouse, cv = G.renderer.canvas;
  C.only(['a_dummy'], [6190, 8], 0); h.combat.equip('ball', true); h.mp = 5; B.reset(); C.step(0.3);
  const d = C.put('a_dummy', 6186, 14); // (well off to the left of the aim below)
  // the cursor on a point 6 m north of Twinsen, then left alone for 6 s
  const aimAt = (wx, wz) => { const v = h.pos.clone().set(wx, h.pos.y + 1.0, wz).project(G.camera), r2 = cv.getBoundingClientRect(); M.x = r2.left + (v.x + 1) / 2 * r2.width; M.y = r2.top + (1 - v.y) / 2 * r2.height; M.inside = true; I.lastDevice = 'kbd'; };
  aimAt(h.pos.x, h.pos.z + 6); M.lastMove = performance.now() - 6000;
  C.step(0.1);
  const still = { aiming: I.mouseAiming(), src: h.combat.lastAim.src, z: +h.combat.lastAim.z.toFixed(2) };
  // charge and walk right (D) while the cursor stays: the throw still goes to the cursor
  let shot = null; const orig = B.launch.bind(B); B.launch = (...a) => { shot = { aim: { ...a[3].aim }, actionT: +h.rig.actionT.toFixed(3) }; orig(...a); const hp = h.pos.clone(); h.rig.j.armR.hand.getWorldPosition(hp); shot.hand = +B.pos.distanceTo(hp).toFixed(3); };
  G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); C.step(0.5);
  G.input.keys.add('KeyD'); const p0 = h.pos.clone(); C.step(0.6);
  const strafe = +h.pos.distanceTo(p0).toFixed(2), legs = h.rig.anim;
  G.input.keys.delete('KeyF'); C.step(0.1);
  // the recovery: the arm doesn't snap when the controller lets go
  let maxJump = 0, prev = h.rig.j.armR.sh.rotation.x, layered = false;
  for (let i = 0; i < 40; i++) { C.step(1 / 60); const v = h.rig.j.armR.sh.rotation.x; maxJump = Math.max(maxJump, Math.abs(v - prev)); prev = v; layered ||= !!h.rig.over && h.rig.anim === 'walk'; }
  G.input.keys.delete('KeyD'); B.launch = orig; C.step(2);
  // Aim Assist Off: aiming 25° to the right of the dummy picks nothing and the ball flies straight
  G.settings.aimAssist = 'off'; C.only(['a_dummy'], [6190, 8], 0); C.put('a_dummy', 6190 + Math.sin(0.44) * 6, 8 + Math.cos(0.44) * 6); B.reset(); C.step(0.2);
  aimAt(h.pos.x, h.pos.z + 6); C.step(0.1);
  const off = { soft: !!G.targeting.soft, target: !!G.targeting.throwTarget({ x: 0, z: 1 }) };
  B.launch(h, 'normal', 1, { aim: { x: 0, z: 1 }, target: G.targeting.throwTarget({ x: 0, z: 1 }) }); C.step(0.3);
  off.drift = +Math.abs(B.pos.x - h.pos.x).toFixed(2); B.reset();
  G.settings.aimAssist = 'normal';
  // the right button: a drag turns the camera and never locks; a short tap locks
  C.only(['a_dummy'], [6190, 8], 0); C.put('a_dummy', 6190, 11); G.targeting.release(); C.step(0.1);
  const pe = (type, o) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', bubbles: true, ...o }));
  pe('pointerdown', { button: 2 }); C.step(1 / 60);
  for (let i = 0; i < 10; i++) { pe('pointermove', { movementX: 6, movementY: 1, clientX: M.x + i * 6, clientY: M.y }); C.step(1 / 60); }
  pe('pointerup', { button: 2 }); C.step(0.1);
  const dragLock = !!G.targeting.lock;
  pe('pointerdown', { button: 2 }); C.step(1 / 60); pe('pointerup', { button: 2 }); C.step(0.1);
  const tapLock = !!G.targeting.lock; G.targeting.release();
  return { still, shot, strafe, legs, maxJump: +maxJump.toFixed(3), layered, off, dragLock, tapLock };
});
check('mouse aim: a cursor left still for 6 s is still the aim', r.still.aiming && r.still.src === 'mouse' && r.still.z > 0.9, r.still);
check('mouse aim: walking sideways while charging does not redirect the throw', r.shot && r.shot.aim.z > 0.9 && r.strafe > 0.2, { shot: r.shot, strafe: r.strafe });
check('charging on the move: the legs walk (no frozen pose)', r.legs === 'walk', { legs: r.legs });
check('the ball leaves the hand at the release frame', r.shot && Math.abs(r.shot.actionT - 0.16) < 0.03 && r.shot.hand < 0.35, r.shot);
check('the follow-through blends into the walk (no arm snap)', r.layered && r.maxJump < 0.3, { maxJump: r.maxJump, layered: r.layered });
check('Aim Assist Off: no soft target, no correction', !r.off.soft && !r.off.target && r.off.drift < 0.05, r.off);
check('a camera drag never toggles the lock; a right tap does', !r.dragLock && r.tapLock, { drag: r.dragLock, tap: r.tapLock });

// 19. Classic (LBA2's keys and tank controls): the arrows turn at 90°/s and walk; holding Alt plants the feet,
//     the arrows turn the aim, the release throws the way he faces; X dodges; the mouse doesn't aim
r = await ev(() => {
  const { G } = C, h = G.hero, B = G.ball, I = G.input;
  G.settings.controls = 'classic'; G.applySettings();
  C.only([], [6190, 8], 0); h.combat.equip('fists', true); h.mp = 5; B.reset(); C.step(0.3);
  I.mouse.inside = true; I.mouse.lastMove = performance.now(); I.lastDevice = 'kbd'; // (a cursor resting on the screen)
  const a0 = h.angle; I.keys.add('ArrowLeft'); C.step(1.0); I.keys.delete('ArrowLeft'); const turn = +(h.angle - a0).toFixed(2);
  const p0 = h.pos.clone(); I.keys.add('ArrowUp'); C.step(0.5); I.keys.delete('ArrowUp'); C.step(0.3); const walked = +h.pos.distanceTo(p0).toFixed(2);
  let shot = null; const orig = B.launch.bind(B); B.launch = (...a) => { shot = { aim: { ...a[3].aim } }; return orig(...a); };
  const p1 = h.pos.clone(), a1 = h.angle;
  I.keys.add('AltLeft'); I.taps.add('AltLeft'); C.step(0.5); I.keys.add('ArrowRight'); C.step(0.6); I.keys.delete('ArrowRight');
  const planted = +h.pos.distanceTo(p1).toFixed(2), aimTurn = +(a1 - h.angle).toFixed(2), facing = { x: Math.sin(h.angle), z: Math.cos(h.angle) };
  I.keys.delete('AltLeft'); C.step(0.3); B.launch = orig; C.step(3);
  const along = shot ? +(shot.aim.x * facing.x + shot.aim.z * facing.z).toFixed(2) : -1;
  const p2 = h.pos.clone(); I.taps.add('KeyX'); I.keys.add('KeyX'); C.step(0.05); I.keys.delete('KeyX'); C.step(0.5); const dodged = +h.pos.distanceTo(p2).toFixed(2);
  G.settings.controls = 'modern'; G.applySettings();
  return { turn, walked, planted, aimTurn, along, dodged, thrown: !!shot };
});
check('classic: the arrows turn at ~90°/s and walk', Math.abs(r.turn - Math.PI / 2) < 0.12 && r.walked > 0.6, r);
check('classic: holding Alt plants the feet and the arrows turn the aim', r.planted < 0.05 && r.aimTurn > 0.5, r);
check('classic: the release throws the way he faces (the resting cursor does not aim)', r.thrown && r.along > 0.98, r);
check('classic: X dodges', r.dodged > 1.5, r);

// 20. Vesk's guards (src/game/guards.js, rules from LBA1's engine): a guard spots Twinsen, raises its rifle with
//     the violet aim line (the tell) and fires; a Grobo guard's armour takes a force-1 hit without harm but not a
//     force-2 one; a beaten guard falls and leaves a bonus
r = await ev(() => {
  const { G, E } = C, h = G.hero;
  C.only(['a_guard'], [6200, 9], Math.PI); const gd = C.put('a_guard', 6200, 3, 0);
  gd.state = 'patrol'; gd.patrol = [[6200, 3]]; gd.hp = gd.maxHp; gd.coolT = 0;
  const seen = new Set(); let line = 0; const hp0 = h.hp;
  for (let i = 0; i < 150; i++) { C.step(1 / 30); seen.add(gd.state); if (gd.aimLine.visible) line = Math.max(line, gd.aimLine.material.opacity); }
  const shotHp = h.hp;
  const gg = E('a_guardG'); gg.setPresent(true); gg.hp = gg.maxHp; gg.state = 'patrol';
  const soft = gg.take(1, h.pos), hpSoft = gg.hp, hard = gg.take(2, h.pos), hpHard = gg.hp;
  const pk0 = G.pickups.list.length;
  for (let k = 0; k < 5 && gd.alive; k++) gd.take(1, h.pos);
  C.step(0.6);
  const out = { states: [...seen], line: +line.toFixed(2), hp: [hp0, shotHp], soft, hpSoft, hard, hpHard, down: !gd.alive, bonus: G.pickups.list.length - pk0 };
  gg.setPresent(false); gd.setPresent(false);
  return out;
});
check('guard: spots, aims with a brightening line (the tell), fires', r.states.includes('alerted') && r.states.includes('aim') && r.line > 0.5 && r.hp[1] < r.hp[0], r);
check("guard: a Grobo guard's armour takes a weak hit without harm, not a strong one", r.soft === 'blocked' && r.hard === 'hit' && r.hpHard < r.hpSoft, r);
check('guard: a beaten guard falls and leaves a bonus', r.down && r.bonus >= 1, r);

// 21. the guard dog (src/game/guarddog.js, LBA2's bodies 51–53): it notices Twinsen, barks (the jaw drops), runs at
//     him, crouches with the jaw wide (the tell), springs and bites; three hits knock it out and leave a bonus
r = await ev(() => {
  const { G } = C, h = G.hero;
  C.only(['a_gdog'], [6200, 9], Math.PI); const dg = C.put('a_gdog', 6200, 3, 0);
  dg.state = 'guard'; dg.patrol = [[6200, 3]]; dg.hp = dg.maxHp; dg.coolT = 0;
  const seen = new Set(); const hp0 = h.hp; let jaw = 0;
  for (let i = 0; i < 240; i++) { C.step(1 / 30); seen.add(dg.state); jaw = Math.max(jaw, dg.rig.M.jaw.rotation.x); }
  const bitHp = h.hp;
  const pk0 = G.pickups.list.length;
  dg.state = 'chase'; for (let k = 0; k < 3; k++) { dg.damage(1, h.pos); C.step(0.1); }
  C.step(0.6);
  const out = { states: [...seen], jaw: +jaw.toFixed(2), hp: [hp0, bitHp], down: !dg.alive, bonus: G.pickups.list.length - pk0 };
  dg.setPresent(false);
  return out;
});
check('guard dog: notices, barks, runs, crouches with the jaw wide (the tell), bites', ['warn', 'chase', 'windup', 'lunge'].every((s) => r.states.includes(s)) && r.jaw > 0.4 && r.hp[1] < r.hp[0], r);
check('guard dog: three hits knock it out and leave a bonus', r.down && r.bonus >= 1, r);

// 22. LBA1's fat FunFrock trooper (kind 'fclone', src/game/guards.js): spots Twinsen, aims, fires; armour 2
r = await ev(() => {
  const { G } = C, h = G.hero;
  C.only(['a_fclone'], [6200, 9], Math.PI); const fc = C.put('a_fclone', 6200, 3, 0);
  fc.state = 'patrol'; fc.patrol = [[6200, 3]]; fc.hp = fc.maxHp; fc.coolT = 0;
  const seen = new Set(); const hp0 = h.hp;
  for (let i = 0; i < 150; i++) { C.step(1 / 30); seen.add(fc.state); }
  const out = { states: [...seen], hp: [hp0, h.hp], soft: fc.take(1, h.pos), look: fc.rig.root.name || '', armour: fc.armour };
  fc.setPresent(false);
  return out;
});
check("FunFrock's trooper: spots, aims, fires; a weak hit is taken on its armour", r.states.includes('aim') && r.hp[1] < r.hp[0] && r.soft === 'blocked' && r.armour === 2, r);

console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
