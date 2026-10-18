// Enemy knock-outs (ANIM-DEATH, src/game/death.js): every enemy type is killed in the developer arena (?arena /
// game.devArena()) and its fall is measured frame by frame:
//  - it leaves the target lists on the frame of the blow (lock, soft target, the ball's aim targets, hits);
//  - pose continuity: the largest rotation of any joint / part of its body (and of the body as a whole) between two
//    frames, as a rate (rad/s), from two frames before the blow to the end; the root's speed;
//  - ground contact: every visible vertex (every 3rd) of its body, measured against the ground under it, never more
//    than CLIP below it; once it lies still, its lowest point touches the ground (no floating) and it no longer moves
//    (no sliding); a humanoid lies down (no standing T-pose: arms never spread out flat);
//  - removal: gone on its clock, out of the scene with its shadow, tells and props; no other object left behind
//    but the bonus; no event listener added;
//  - the bonus: one, out of the body, landed on the ground (resting at its height above the ground, not in a wall);
//  - and the cases: 30 vs 60 fps (same clock, same resting place), killed in the air, on a slope (the island's
//    terrain), across stairs (the arena's steps), with a wall behind (falls the other way) and with no room
//    (slumps), the player leaving the scene, a dialogue, the pause, a story change of cast, a reload mid-fall.
// Prints PASS/FAIL lines with the measured values (MEASURE lines for the tables in QA).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
// count live event listeners (window, document, elements) from the start
await page.addInitScript(() => {
  window.__listeners = 0;
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener, seen = new WeakMap();
  EventTarget.prototype.addEventListener = function (t, f, o) { if (f) { let m = seen.get(this); if (!m) seen.set(this, (m = new Set())); const k = t + '|' + (typeof o === 'object' ? !!o?.capture : !!o); if (!m.has(f)) { m.add(f); f.__k = k; window.__listeners++; } } return add.call(this, t, f, o); };
  EventTarget.prototype.removeEventListener = function (t, f, o) { const m = seen.get(this); if (f && m?.has(f)) { m.delete(f); window.__listeners--; } return rem.call(this, t, f, o); };
});
const ev = (f, a) => page.evaluate(f, a);
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, JSON.stringify(info)); };
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });

const LIM = { rate: 16, rootSpeed: 12, clip: 0.05, float: 0.04, slide: 0.05, armOut: 1.35 };
await ev(async (LIM) => {
  const G = window.game; G.testFreeze = true;
  G.devArena();
  const M = await import('/src/game/enemies.js');
  const cx = 6200;
  // the bosses and the heavy drone are not in the arena: one of each, parked
  G.enemies.push(M.createEnemy(G, { id: 'a_guardian', kind: 'guardian', x: cx + 6, z: -6, group: 'arenaB' }));
  G.enemies.push(M.createEnemy(G, { id: 'a_heavy', kind: 'drone', hp: 8, x: cx + 6, z: -6, patrol: [[cx + 6, -6]], group: 'arenaC' }));
  const V = (x, y, z) => new (G.camera.position.constructor)(x, y, z);
  window.D = {
    G, LIM,
    E: (id) => G.enemies.find((e) => e.id === id),
    // a fresh copy of a type (each kill needs a living enemy)
    spawn(kind, x, z, extra = {}) {
      const id = 'k_' + kind + '_' + (D.n = (D.n || 0) + 1);
      const def = { id, kind, x, z, group: 'kgroup' + D.n, patrol: [[x, z]], ...extra };
      if (kind === 'heavy') { def.kind = 'drone'; def.hp = 8; }
      const e = M.createEnemy(G, def); G.enemies.push(e);
      e.coolT = 99; e.canAttackOverride = false; e.home = { x, z };
      return e;
    },
    only(keep = []) {
      for (const e of G.enemies) if (e.present && !keep.includes(e) && !e.ko && e.alive) e.setPresent(false);
      const h = G.hero; h.pos.set(cx - 12, G.physics.groundAt(cx - 12, 10), 10); h.vel?.set(0, 0); h.hp = h.maxHp; h.dead = false; h.invuln = 99;
      G.resetCombat(); G.combatDir.grace = 0; G.state = 'play';
      for (const p of [...G.pickups.list]) if (!p.id) { G.scene.remove(p.mesh); G.pickups.list.splice(G.pickups.list.indexOf(p), 1); }
    },
    place(e, x, z, a, y = null) {
      e.pos.set(x, y ?? G.physics.groundAt(x, z), z); e.angle = a; e.kb?.set(0, 0); e.vy = 0; e.onGround = y == null;
      if (e.patrol) { e.patrol = [[x, z]]; e.wp = 0; } e.home = { x, z }; e.coolT = 99;
      if (e.wanderT != null) e.wanderT = 0.9;   // (a mite stands still for the measure)
      e.sync?.(); e.syncHover?.();
    },
    kill(e, from) {
      if (e.powerDown) { e.powerDown(); return; }
      if (e.take) e.take(99, from); else e.damage(99, from, 4);
    },
    snap(e) { const m = new Map(); e.rig.root.traverse((o) => m.set(o, { q: o.quaternion.clone(), p: o.parent })); return m; },
    // every 3rd vertex of every visible mesh of the body, in the world: lowest point above the ground under it
    contact(e) {
      const root = e.rig.root; root.updateMatrixWorld(true);
      let min = Infinity, v = V(0, 0, 0), inWall = 0;
      root.traverse((o) => {
        if (!o.isMesh || !o.geometry?.attributes?.position) return;
        for (let p = o; p; p = p.parent) if (!p.visible && p !== root) return;
        const mt = Array.isArray(o.material) ? o.material[0] : o.material; if (mt?.transparent) return;
        const P = o.geometry.attributes.position;
        for (let i = 0; i < P.count; i += 3) {
          if (o.isSkinnedMesh) o.getVertexPosition(i, v); else v.fromBufferAttribute(P, i);
          v.applyMatrix4(o.matrixWorld);
          const d = v.y - G.physics.groundAt(v.x, v.z, v.y + 0.6);
          if (d < min) min = d;
          if (d > 0.05 && G.physics.solidAt(v.x, v.z, v.y, -0.08)) inWall++;   // (above the ground, inside a solid)
        }
      });
      return { min, inWall };
    },
    // run one knock-out to its end; returns the measures
    run(e, opt = {}) {
      const dt = opt.dt || 1 / 60, from = opt.from || { x: e.pos.x - 1.5, y: e.pos.y, z: e.pos.z };
      const scene0 = new Set(G.scene.children), pick0 = new Set(G.pickups.list), lis0 = window.__listeners;
      // two frames before the blow (the pose it is interrupted in), with the parts that spin anyway (a rotor)
      const spin = new Set(); let r0clip = 0;
      let prev = D.snap(e);
      for (let i = 0; i < 6; i++) {
        G.frame(dt, false); const cur = D.snap(e);
        for (const [o, s] of cur) { const s0 = prev.get(o); if (s0 && s0.p === s.p && s0.q.angleTo(s.q) / dt > 8) spin.add(o); }
        prev = cur;
      }
      const base = D.contact(e); r0clip = Math.max(0, -base.min);
      if (opt.lock) { G.targeting.lock = e; }
      let rootPrev = e.rig.root.getWorldPosition(V(0, 0, 0));
      D.kill(e, from);
      const ko = e.ko;
      const r = { kind: e.def.kind, alive: e.alive, lockAfter: null, aimHas: G.ballAimTargets().some((t) => t.enemy === e), pickNow: G.targeting.pick({ x: Math.sin(Math.atan2(e.pos.x - G.hero.pos.x, e.pos.z - G.hero.pos.z)), z: Math.cos(Math.atan2(e.pos.x - G.hero.pos.x, e.pos.z - G.hero.pos.z)) }, 30, 3) === e,
        hitAfter: G.ballHitTest(V(e.pos.x, e.pos.y + (e.aimY || 0.6) + (e.hover || 0), e.pos.z), { hits: new Set(), damage: 1 })?.enemy === e,
        clip0: +r0clip.toFixed(3), clipDown: 0, rate: 0, rateWho: '', rateT: 0, rootSpeed: 0, clip: 0, clipT: 0, inWall: 0, float: null, slide: 0, lay: null, armOut: 0, goneT: null, impactT: null, frames: 0, mode: ko?.fall?.mode, dir: ko?.fall?.dir };
      let t = 0, settledAt = null, restPos = null, visPrev = true;
      const settle = ko ? (ko.T.settle + (ko.T.impact ?? 0.35) * 0 + 0.15) : 1;
      while (t < (opt.until || 4.5)) {
        if (opt.at) for (const [at, f] of opt.at) if (t <= at && t + dt > at) f(e);
        G.frame(dt, opt.render === true); t += dt; r.frames++;
        if (r.lockAfter == null) r.lockAfter = !!G.targeting.lock;
        if (e.gone) { if (r.goneT == null) r.goneT = +t.toFixed(3); break; }
        const cur = D.snap(e), root = e.rig.root, vis = root.visible;
        if (vis && visPrev) {
          for (const [o, s] of cur) {
            const s0 = prev.get(o); if (!s0 || s0.p !== s.p || spin.has(o)) continue;
            const rr = s0.q.angleTo(s.q) / dt; if (rr > r.rate) { r.rate = rr; r.rateWho = o.name || o.type; r.rateT = +t.toFixed(3); }
          }
          const wp = root.getWorldPosition(V(0, 0, 0)); r.rootSpeed = Math.max(r.rootSpeed, wp.distanceTo(rootPrev) / dt); rootPrev = wp;
        } else rootPrev = root.getWorldPosition(V(0, 0, 0));
        prev = cur; visPrev = vis;
        if (r.frames % (opt.every || 2) === 0 || t < 1.2) {
          const c = D.contact(e);
          if (-c.min > r.clip) { r.clip = -c.min; r.clipT = +t.toFixed(3); }
          if (ko?.impactT != null) r.clipDown = Math.max(r.clipDown, -c.min);   // (once down: none of the standing allowance is left)
          r.inWall = Math.max(r.inWall, c.inWall);
          // lying still: touches the ground, does not move
          if (ko && ko.t > settle && ko.t < ko.T.blink && vis) {
            const p = root.position.clone();
            if (!restPos) { restPos = p; settledAt = t; r.float = c.min; }
            else { r.slide = Math.max(r.slide, Math.hypot(p.x - restPos.x, p.z - restPos.z)); r.float = Math.max(r.float, c.min); }
          }
        }
        if (ko?.impactT != null && r.impactT == null) r.impactT = +ko.impactT.toFixed(3);
        const j = e.rig.j;
        if (j?.armL?.sh) r.armOut = Math.max(r.armOut, Math.abs(j.armL.sh.rotation.z), Math.abs(j.armR.sh.rotation.z));
        if (j?.body && ko && ko.t > settle && ko.t < ko.T.blink) r.lay = { body: +j.body.rotation.x.toFixed(2), hips: +j.hips.position.y.toFixed(2) };
      }
      r.restPos = restPos ? [+restPos.x.toFixed(3), +restPos.y.toFixed(3), +restPos.z.toFixed(3)] : null;
      r.settledAt = settledAt && +settledAt.toFixed(2);
      // what is left in the scene: only the bonus
      const added = G.scene.children.filter((o) => !scene0.has(o));
      const bonus = G.pickups.list.filter((p) => !pick0.has(p));
      r.leftover = added.filter((o) => !bonus.some((p) => p.mesh === o)).map((o) => o.type + ':' + (o.name || ''));
      r.inScene = [e.rig.root, e.shadow, e.aimLine, e.ring, e.rifle].filter((o) => o && (o.parent || G.scene.children.includes(o))).length;
      r.listeners = window.__listeners - lis0;
      // the bonus: let it land
      for (let i = 0; i < 120 && bonus.some((p) => p.fly); i++) G.frame(1 / 60, false);
      r.bonus = bonus.map((p) => { const gy = G.physics.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.3); return { type: p.type, flying: !!p.fly, above: +(p.baseY - gy).toFixed(3), inWall: G.physics.solidAt(p.pos.x, p.pos.z, p.pos.y, 0), dist: +Math.hypot(p.pos.x - (restPos?.x ?? e.pos.x), p.pos.z - (restPos?.z ?? e.pos.z)).toFixed(2) }; });
      for (const k of ['rate', 'rootSpeed', 'clip', 'clipDown', 'slide']) r[k] = +r[k].toFixed(3);
      if (r.float != null) r.float = +r.float.toFixed(3);
      r.armOut = +r.armOut.toFixed(2);
      return r;
    },
  };
}, LIM);

const okRun = (name, r, { bonus = 1, lie = false } = {}) => {
  const L = LIM;
  check(`${name}: leaves the target lists at once`, !r.alive && !r.aimHas && !r.pickNow && !r.hitAfter && r.lockAfter === false, { alive: r.alive, aim: r.aimHas, pick: r.pickNow, hit: r.hitAfter, lock: r.lockAfter });
  check(`${name}: no pop (joint rate ≤ ${L.rate} rad/s, root ≤ ${L.rootSpeed} m/s)`, r.rate <= L.rate && r.rootSpeed <= L.rootSpeed, { rate: r.rate, who: r.rateWho, at: r.rateT, root: r.rootSpeed });
  // (standing, its pose may already dip into uneven ground or a step, clip0: the fall never makes it worse, and once
  // down nothing of it is in the ground)
  check(`${name}: never in the ground (≤ ${L.clip} m once down; standing no worse than before the blow) nor in a wall`, r.clip <= Math.max(L.clip, r.clip0 + 0.02) && r.clipDown <= L.clip && r.inWall === 0, { clip: r.clip, at: r.clipT, clip0: r.clip0, down: r.clipDown, inWall: r.inWall });
  check(`${name}: lies on the ground (lowest point ≤ ${L.float} m) and still (≤ ${L.slide} m)`, r.float != null && r.float <= L.float && r.slide <= L.slide, { float: r.float, slide: r.slide, settledAt: r.settledAt });
  if (lie) check(`${name}: lies down, arms never spread flat (no T-pose)`, r.lay && (Math.abs(r.lay.body) > 1.2 || r.lay.hips < 0.4) && r.armOut <= L.armOut, { lay: r.lay, armOut: r.armOut, mode: r.mode });
  check(`${name}: gone, out of the scene, nothing left behind, no listener added`, r.goneT != null && r.inScene === 0 && r.leftover.length === 0 && r.listeners === 0, { goneT: r.goneT, inScene: r.inScene, leftover: r.leftover, listeners: r.listeners });
  if (bonus) check(`${name}: one bonus, out of the body, landed on the ground`, r.bonus.length === 1 && r.bonus.every((b) => !b.flying && Math.abs(b.above - 0.3) < 0.03 && !b.inWall && b.dist < 3.5), r.bonus);
  else check(`${name}: no bonus (as before)`, r.bonus.length === 0, r.bonus);
  console.log('MEASURE', name, JSON.stringify({ rate: r.rate, root: r.rootSpeed, clip: r.clip, float: r.float, slide: r.slide, impact: r.impactT, gone: r.goneT, mode: r.mode, dir: r.dir }));
};

// 1. every type, on the arena's flat floor at 60 fps, hit from the front (the guard while the lock is on it)
const TYPES = [['guard', true], ['guardG', true], ['fclone', true], ['gdog'], ['mite'], ['crawler'], ['drone'], ['heavy'], ['sentry'], ['guardian']];
for (const [kind, lie] of TYPES) {
  const r = await ev(([kind]) => {
    const e = D.spawn(kind, 6196, -9); D.only([e]); D.place(e, 6196, -9, -Math.PI / 2);
    return D.run(e, { lock: kind === 'guard' });
  }, [kind]);
  okRun(kind, r, { bonus: kind === 'guardian' ? 0 : 1, lie });
}

// 2. the same clock and the same resting place at 30 and 60 fps (and with long 1/20 s frames)
for (const kind of ['guard', 'gdog', 'mite', 'drone', 'sentry']) {
  const r = await ev(([kind]) => {
    const out = {};
    for (const [k, dt] of [['f60', 1 / 60], ['f30', 1 / 30], ['f20', 1 / 20]]) {
      const e = D.spawn(kind, 6196, -9); D.only([e]); D.place(e, 6196, -9, -Math.PI / 2);
      const r = D.run(e, { dt, every: 1 });
      out[k] = { rest: r.restPos, gone: r.goneT, impact: r.impactT, rate: r.rate, clip: r.clip, float: r.float };
    }
    return out;
  }, [kind]);
  const d = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : 9);
  check(`${kind}: 30 and 60 fps play the same fall (rest within 6 cm, gone within a frame)`, d(r.f60.rest, r.f30.rest) < 0.06 && Math.abs(r.f60.gone - r.f30.gone) <= 1 / 30 + 1e-6 && r.f30.clip <= LIM.clip, r);
  check(`${kind}: long frames (1/20 s) still land it on the ground`, d(r.f60.rest, r.f20.rest) < 0.12 && r.f20.clip <= LIM.clip + 0.02 && r.f20.float <= LIM.float + 0.02, r.f20);
}

// 3. killed in the air: it falls with gravity and lies on the ground below (humanoid, dog, mite)
for (const kind of ['guard', 'gdog', 'mite']) {
  const r = await ev(([kind]) => { const e = D.spawn(kind, 6196, -9); D.only([e]); D.place(e, 6196, -9, -Math.PI / 2, 1.6); return D.run(e); }, [kind]);
  okRun(kind + ' (killed in the air, 1.6 m up)', r, { lie: kind === 'guard' });
}

// 4. across stairs (the arena's two steps, 0.4 m each, down to the floor) and on a slope (the island's terrain)
{
  const r = await ev(() => { const e = D.spawn('guard', 6210, -3.35); D.only([e]); D.place(e, 6210, -3.35, Math.PI); return D.run(e, { from: { x: 6210, y: 0.4, z: -5 } }); });
  okRun('guard (on the lower step, falls down the stairs)', r, { lie: true });
  const r2 = await ev(() => { const e = D.spawn('gdog', 6210, -3.6); D.only([e]); D.place(e, 6210, -3.6, Math.PI / 2); return D.run(e, { from: { x: 6208, y: 0.4, z: -3.6 } }); });
  okRun('gdog (on the stairs)', r2);
}
const slope = await ev(() => {
  // the steepest clear walkable spot on Citadel's terrain near the village (a hillside), found by sampling
  const G = D.G, P = G.physics, T = P.terrain; let best = null;
  for (let x = -140; x <= 60; x += 3) for (let z = -100; z <= 120; z += 3) {
    const h = T.heightAt(x, z); if (h < 0.5) continue;
    const gx = (T.heightAt(x + 1, z) - T.heightAt(x - 1, z)) / 2, gz = (T.heightAt(x, z + 1) - T.heightAt(x, z - 1)) / 2, s = Math.hypot(gx, gz);
    if (s < 0.25 || s > 0.6 || P.near(x, z).some((c) => c.enabled && P._inside(c, x, z, 2.5))) continue;
    // an even hillside (the plane holds 2.2 m round), not a gully
    let even = true;
    for (let i = 0; i < 8 && even; i++) { const q = i * Math.PI / 4, dx = Math.sin(q) * 2.2, dz = Math.cos(q) * 2.2; if (Math.abs(T.heightAt(x + dx, z + dz) - (h + gx * dx + gz * dz)) > 0.12) even = false; }
    if (!even) continue;
    if (!best || s > best.s) best = { x, z, s, up: Math.atan2(gx, gz) };
  }
  return best;
});
if (slope) {
  for (const [kind, face, label] of [['guard', 0, 'facing uphill, falls downhill'], ['guard', Math.PI, 'facing downhill, falls uphill'], ['gdog', Math.PI / 2, 'across the slope'], ['sentry', 0, 'facing uphill'], ['mite', 0, '']]) {
    const r = await ev(([kind, face, S]) => {
      const G = D.G; G.exitRoom({ x: S.x + 6, z: S.z + 6 }, true, true);
      const e = D.spawn(kind, S.x, S.z); D.only([e]);
      G.hero.pos.set(S.x + 8, G.physics.groundAt(S.x + 8, S.z + 8), S.z + 8);
      const a = S.up + face; D.place(e, S.x, S.z, a);
      const r = D.run(e, { from: { x: S.x + Math.sin(a) * 1.5, y: 0, z: S.z + Math.cos(a) * 1.5 } });
      G.devArena(); return r;
    }, [kind, face, slope]);
    okRun(`${kind} on a slope of ${slope.s.toFixed(2)} at ${slope.x},${slope.z} (${label || 'uphill'})`, r, { lie: kind === 'guard' });
  }
} else check('a slope to test on', false, null);

// 5. a wall behind: falls the other way, never into the wall; no room either way: slumps where it stands
{
  // the arena's inner wall runs x 6195..6201 at z = 2 (0.4 thick); the guard stands just south of it facing south
  const r = await ev(() => { const e = D.spawn('guard', 6198, 2.75); D.only([e]); D.place(e, 6198, 2.75, 0); return D.run(e, { from: { x: 6198, y: 0, z: 4.5 } }); });
  okRun('guard (wall behind it)', r, { lie: true });
  check('guard (wall behind it): falls forward, away from the wall', r.mode === 'fall' && r.dir === -1, { mode: r.mode, dir: r.dir });
  const r2 = await ev(() => {
    const G = D.G, P = G.physics, box = P.add({ type: 'box', x: 6198, z: 4.25, hw: 2, hd: 0.2, rot: 0, top: 2.5 });
    const e = D.spawn('guardG', 6198, 3.1); D.only([e]); D.place(e, 6198, 3.1, 0);
    const r = D.run(e, { from: { x: 6198, y: 0, z: 3.9 } });
    box.enabled = false; return r;
  });
  okRun('guardG (walls in front and behind)', r2, { lie: true });
  check('guardG (walls in front and behind): slumps where it stands', r2.mode === 'slump', { mode: r2.mode });
}

// 6. interruptions mid-fall: the pause freezes it; a dialogue lets it land; leaving the scene, a story change of
// cast or a reload never leave it hanging, popping or in the scene
{
  const r = await ev(() => {
    const G = D.G, e = D.spawn('guard', 6196, -9); D.only([e]); D.place(e, 6196, -9, -Math.PI / 2);
    D.kill(e, { x: 6194.5, y: 0, z: -9 });
    for (let i = 0; i < 18; i++) G.frame(1 / 60, false);
    const t0 = e.ko.t; G.pause(); for (let i = 0; i < 60; i++) G.frame(1 / 60, false);
    const paused = { state: G.state, dt: +(e.ko.t - t0).toFixed(3) };
    G.act?.('resume'); if (G.state !== 'play') { G.hideScreens?.(); G.setState('play'); }
    for (let i = 0; i < 30; i++) G.frame(1 / 60, false);
    return { paused, resumed: +(e.ko.t - t0).toFixed(3) };
  });
  check('pause mid-fall: the fall freezes and goes on after', r.paused.state === 'pause' && r.paused.dt === 0 && r.resumed > 0.4, r);
}
for (const [key, label] of [
  ['dialog', 'a dialogue starts mid-fall (it lands during the dialogue)'],
  ['leave', 'the player leaves the scene mid-fall (into the house)'],
  ['cast', 'the story changes the cast mid-fall (setPresent(false))'],
]) {
  const r = await ev(([key]) => {
    const G = D.G, e = D.spawn('guard', 6196, -9); D.only([e]); D.place(e, 6196, -9, -Math.PI / 2);
    const intr = { dialog: () => G.say('test', ['A line.']), leave: () => G.enterRoom('house', null, true, true), cast: () => e.setPresent(false) };
    let during = null;
    const r = D.run(e, { at: [[0.3, intr[key]], [1.0, () => { during = { state: G.state, t: +e.ko.t.toFixed(2), bonusFlying: G.pickups.list.some((p) => p.koDrop && p.fly) }; }], [1.8, () => { if (G.state === 'dialog') G.hud.advance(); }], [1.9, () => { if (G.state === 'dialog') G.hud.advance(); }]] });
    r.during = during;
    if (G.state === 'dialog') { G.hud.advance?.(); G.setState('play'); }
    G.devArena(); return r;
  }, [key]);
  check(`${label}: finishes, lands, gone, bonus on the ground`, r.goneT != null && r.inScene === 0 && r.clipDown <= LIM.clip && r.rate <= LIM.rate && r.bonus.length === 1 && !r.bonus[0].flying, { during: r.during, goneT: r.goneT, inScene: r.inScene, clip: r.clip, rate: r.rate, float: r.float, bonus: r.bonus });
}
{
  // a reload (Continue) with a fall in progress: the saved kill comes back as gone, nothing of it in the scene
  const r = await ev(() => {
    const G = D.G, e = D.spawn('guard', 6196, -9); D.only([e]); D.place(e, 6196, -9, -Math.PI / 2);
    D.kill(e, { x: 6194.5, y: 0, z: -9 });
    for (let i = 0; i < 20; i++) G.frame(1 / 60, false);
    const s = G.snapshot(); s.room = 'arena';
    G.applySave(JSON.parse(JSON.stringify(s)));
    for (let i = 0; i < 10; i++) G.frame(1 / 60, false);
    return { killed: G.killed.includes(e.id), gone: !!e.gone, inScene: [e.rig.root, e.shadow, e.aimLine, e.rifle].filter((o) => o?.parent).length };
  });
  check('a reload mid-fall: the kill is kept and the body is gone', r.killed && r.gone && r.inScene === 0, r);
}

// 7. a real kill by the ball with the automatic aim (CTRL-1): the next throw goes to the next enemy, never the body
{
  const r = await ev(() => {
    const G = D.G, h = G.hero, a = D.spawn('mite', 6196, -4), b = D.spawn('mite', 6199, -4.5); D.only([a, b]);
    D.place(a, 6196, -4, 0); D.place(b, 6199, -4.5, 0); a.hp = 1; b.hp = 50;
    h.pos.set(6196, G.physics.groundAt(6196, -9), -9); h.angle = 0; h.hasBall = true; h.mp = h.mpMax || 20; h.invuln = 99;
    h.combat.equip('ball', true); G.settings.aimAssist = 'normal';
    const aim = { x: 0, z: 1 };
    const first = G.targeting.throwTarget(aim)?.id;
    G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); G.frame(1 / 60, false); G.input.keys.delete('KeyF');
    let t = 0; while (a.alive && t < 3) { G.frame(1 / 60, false); t += 1 / 60; }
    const then = G.targeting.throwTarget({ x: Math.sin(Math.atan2(a.pos.x - h.pos.x, a.pos.z - h.pos.z)), z: Math.cos(Math.atan2(a.pos.x - h.pos.x, a.pos.z - h.pos.z)) })?.id;
    const aimList = G.ballAimTargets().filter((q) => q.enemy).map((q) => q.enemy.id);
    for (let i = 0; i < 200 && !a.gone; i++) G.frame(1 / 60, false);
    return { first, a: a.id, b: b.id, killedBy: t.toFixed(2), dyingAlive: a.alive, then, aimList, gone: !!a.gone };
  });
  check('the ball kills the auto-aimed mite; at once the aim moves on to the living one', r.first === r.a && !r.dyingAlive && r.then === r.b && !r.aimList.includes(r.a) && r.gone, r);
}

// 8. the developer arena and the tests bring a beaten enemy back by giving it a living state: it stands as it was
{
  const r = await ev(() => {
    const G = D.G, out = {};
    for (const kind of ['guard', 'mite', 'drone']) {
      const e = D.spawn(kind, 6196, -9); D.only([e]); D.place(e, 6196, -9, -Math.PI / 2);
      D.kill(e, { x: 6194.5, y: 0, z: -9 }); for (let i = 0; i < 40; i++) G.frame(1 / 60, false);   // (mid-fall)
      e.state = e.patrol ? 'patrol' : 'idle'; e.hp = e.maxHp; e.setPresent(true);
      for (let i = 0; i < 30; i++) G.frame(1 / 60, false);
      out[kind] = { alive: e.alive, inScene: !!e.rig.root.parent, visible: e.rig.root.visible, ko: !!e.ko, tilt: +(1 - Math.abs(e.rig.root.up.clone().applyQuaternion(e.rig.root.quaternion).y)).toFixed(3) };
      e.setPresent(false);
    }
    return out;
  });
  check('a beaten enemy given a living state again (the arena, tests) stands as before', Object.values(r).every((v) => v.alive && v.inScene && v.visible && !v.ko && v.tilt < 0.01), r);
}

console.log(errs.length ? errs.slice(0, 15).join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
