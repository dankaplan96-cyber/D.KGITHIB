// ANIM-COMBAT capture: plays Twinsen's combat moves in the developer arena by input, at a fixed step, and records
// every step (pose numbers, hand / feet / ball positions, combat clocks) plus frame crops for strips.
// usage: GAME_URL=http://localhost:8180/ OUT=<dir> FPS=60 SHOTS=1 node cap.mjs <seq> [<seq> ...]
// seqs: throw, throwWalk, throwStrafe, throwBack, charge, chargeWalk, sword, heavy, fists, glove, hurt, strafe, lockTurn, idle
// Writes <OUT>/<seq>.json (samples) and <OUT>/<seq>-NNN.png (crops of the side view, every SHOT_EVERY steps).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '.';
const FPS = +(process.env.FPS || 60);
const SHOTS = process.env.SHOTS !== '0';
const EVERY = +(process.env.SHOT_EVERY || Math.max(1, Math.round(FPS / 30)));
const VIEW = process.env.VIEW || 'side';
const seqs = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto((process.env.GAME_URL || 'http://localhost:8180/'), { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await page.evaluate(() => {
  const G = window.game; G.testFreeze = true;
  G.settings.controls = 'modern'; G.applySettings();
  G.devArena();
  document.querySelectorAll('#hud, .hud, #objective').forEach((e) => (e.style.display = 'none'));
  const THREEV = G.hero.pos.constructor;
  const wp = (o) => { const v = new THREEV(); o.updateWorldMatrix(true, false); o.getWorldPosition(v); return v; };
  window.CAP = {
    G,
    reset(heroAt = [6194, 4], a = 0, enemies = []) {
      for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(enemies.includes(e.id)); }
      const h = G.hero; h.pos.set(heroAt[0], G.physics.groundAt(heroAt[0], heroAt[1]), heroAt[1]); h.angle = a; h.vel.set(0, 0);
      h.hp = h.maxHp; h.mp = h.mpMax; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0; h.hasBall = true; h.hasSword = true;
      G.resetCombat(); G.combatDir.grace = 0; G.state = 'play'; G.targeting.release();
      G.input.keys.clear(); G.input.taps?.clear?.();
      G.ball.toHand?.(true);
      for (let i = 0; i < 40; i++) G.frame(1 / 60, false);
      this.t = 0; this.camA = null;
    },
    put(id, x, z, a = 0) { const e = G.enemies.find((q) => q.id === id); e.setPresent(true); e.pos.set(x, G.physics.groundAt(x, z), z); e.angle = a; e.kb?.set(0, 0); e.sync?.(); e.coolT = 99; e.state = 'idle'; return e; },
    sample(dt) {
      const h = G.hero, r = h.rig, j = r.j, c = h.combat, b = G.ball;
      const P = (o) => { const v = wp(o); return [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)]; };
      const rot = {};
      for (const [k, o] of Object.entries({ hip: j.hips, torso: j.torso, neck: j.neck, head: j.head, body: j.body, shL: j.armL.sh, shR: j.armR.sh, elL: j.armL.el, elR: j.armR.el, legL: j.legL.hip, legR: j.legR.hip, knL: j.legL.knee, knR: j.legR.knee, ftL: j.legL.foot, ftR: j.legR.foot }))
        if (o) rot[k] = [+o.rotation.x.toFixed(4), +o.rotation.y.toFixed(4), +o.rotation.z.toFixed(4)];
      return {
        t: +this.t.toFixed(4), dt, anim: r.anim, actionT: +r.actionT.toFixed(3), over: r.over ? [r.over.kind, +r.over.t.toFixed(3)] : null, moveRel: +(r.moveRel || 0).toFixed(3),
        pos: [+h.pos.x.toFixed(4), +h.pos.y.toFixed(4), +h.pos.z.toFixed(4)], angle: +h.angle.toFixed(4), speed: +h.speed.toFixed(3),
        handR: P(j.armR.hand), handL: P(j.armL.hand), footL: P(j.legL.foot), footR: P(j.legR.foot), head: P(j.head), hips: P(j.hips), rot,
        ball: { state: b.state, pos: [+b.mesh.position.x.toFixed(4), +b.mesh.position.y.toFixed(4), +b.mesh.position.z.toFixed(4)] },
        thr: c.throwing ? { at: +c.throwing.at.toFixed(3), released: c.throwing.released, charging: !!c.throwing.charging } : null,
        move: c.move ? { key: c.move.key, t: +c.move.t.toFixed(3), hits: c.move.hit.size } : null,
        hurtT: +h.hurtT.toFixed(3), lock: !!G.targeting.lock, dbg: r._dbg ? JSON.parse(JSON.stringify(r._dbg)) : null,
        plant: r._feet ? ['L', 'R'].map((k) => { const f = r._feet[k]; return (f.on ? (f.stepping ? 'S' : 'P') : '-') + (+f.w.toFixed(2)); }).concat(+r._feet.w.toFixed(2)) : null,
      };
    },
    step(keys, dt, taps = []) {
      const G2 = G; G2.input.keys.clear(); for (const k of keys) G2.input.keys.add(k); for (const k of taps) { G2.input.keys.add(k); G2.input.taps.add(k); }
      G2.frame(dt, false); this.t += dt;
      for (const k of taps) if (!keys.includes(k)) G2.input.keys.delete(k);
      return this.sample(dt);
    },
    shot(view) {
      const h = G.hero, c = G.camera, p = h.pos;
      if (this.camA == null) this.camA = h.angle;
      if (view === 'game') { G.camRig.update(0.016, h.pos, h.angle, false, null); }
      else {
        const a = this.camA + (view === 'front' ? 0 : view === 'back' ? Math.PI : -Math.PI / 2), d = 9.5;
        c.fov = 34; c.updateProjectionMatrix();
        const cx = this.cx ?? p.x, cz = this.cz ?? p.z;
        c.position.set(cx + Math.sin(a) * d, p.y + 1.6, cz + Math.cos(a) * d); c.lookAt(cx, p.y + 1.0, cz);
      }
      c.updateMatrixWorld();
      G.renderer.render();
      const v = h.pos.clone(); v.y += 1.05; v.project(c);
      return [(v.x + 1) * 450, (1 - v.y) * 280];
    },
  };
});

// each sequence: [setup(), steps] where steps is a list of { keys, taps, secs }
const SEQ = {
  idle: { setup: 'CAP.reset([6194,4],0)', steps: [{ keys: [], secs: 1.0 }] },
  throw: { setup: 'CAP.reset([6194,4],0)', steps: [{ keys: [], secs: 0.1 }, { keys: [], taps: ['KeyF'], secs: 1 / FPS }, { keys: [], secs: 0.9 }] },
  // walking forward (W, camera-relative) while throwing straight ahead
  throwWalk: { setup: 'CAP.reset([6194,0],0); CAP.G.camRig.yaw = Math.PI', steps: [{ keys: ['KeyW'], secs: 0.6 }, { keys: ['KeyW'], taps: ['KeyF'], secs: 1 / FPS }, { keys: ['KeyW'], secs: 0.9 }] },
  // locked onto the dummy ahead and walking sideways (strafe) while throwing
  throwStrafe: { setup: "CAP.reset([6194,2],0,['a_dummy']); CAP.put('a_dummy',6194,9); CAP.G.camRig.yaw = Math.PI; CAP.G.targeting.lock = CAP.G.enemies.find(e=>e.id==='a_dummy')", steps: [{ keys: ['KeyD'], secs: 0.6 }, { keys: ['KeyD'], taps: ['KeyF'], secs: 1 / FPS }, { keys: ['KeyD'], secs: 0.9 }] },
  throwBack: { setup: "CAP.reset([6194,2],0,['a_dummy']); CAP.put('a_dummy',6194,9); CAP.G.camRig.yaw = Math.PI; CAP.G.targeting.lock = CAP.G.enemies.find(e=>e.id==='a_dummy')", steps: [{ keys: ['KeyS'], secs: 0.6 }, { keys: ['KeyS'], taps: ['KeyF'], secs: 1 / FPS }, { keys: ['KeyS'], secs: 0.9 }] },
  charge: { setup: 'CAP.reset([6194,4],0)', steps: [{ keys: [], secs: 0.1 }, { keys: ['KeyF'], taps: ['KeyF'], secs: 1 / FPS }, { keys: ['KeyF'], secs: 1.1 }, { keys: [], secs: 0.9 }] },
  chargeWalk: { setup: "CAP.reset([6194,2],0,['a_dummy']); CAP.put('a_dummy',6194,9); CAP.G.camRig.yaw = Math.PI; CAP.G.targeting.lock = CAP.G.enemies.find(e=>e.id==='a_dummy')", steps: [{ keys: [], secs: 0.1 }, { keys: ['KeyF'], taps: ['KeyF'], secs: 1 / FPS }, { keys: ['KeyF', 'KeyD'], secs: 1.1 }, { keys: ['KeyD'], secs: 0.9 }] },
  sword: { setup: "CAP.reset([6194,4],0,['a_dummy']); CAP.put('a_dummy',6194,5.6); CAP.G.hero.combat.equip('sword',true)", steps: [{ keys: [], secs: 0.2 }, { keys: [], taps: ['KeyK'], secs: 1 / FPS }, { keys: [], secs: 0.36 }, { keys: [], taps: ['KeyK'], secs: 1 / FPS }, { keys: [], secs: 0.36 }, { keys: [], taps: ['KeyK'], secs: 1 / FPS }, { keys: [], secs: 1.0 }] },
  heavy: { setup: "CAP.reset([6194,4],0,['a_dummy']); CAP.put('a_dummy',6194,5.6); CAP.G.hero.combat.equip('sword',true)", steps: [{ keys: [], secs: 0.2 }, { keys: ['KeyK'], taps: ['KeyK'], secs: 1 / FPS }, { keys: ['KeyK'], secs: 1.0 }, { keys: [], secs: 1.0 }] },
  fists: { setup: "CAP.reset([6194,4],0,['a_dummy']); CAP.put('a_dummy',6194,5.3); CAP.G.hero.combat.equip('fists',true); CAP.G.hero.weapon='fists'", steps: [{ keys: [], secs: 0.2 }, { keys: [], taps: ['KeyK'], secs: 1 / FPS }, { keys: [], secs: 0.25 }, { keys: [], taps: ['KeyK'], secs: 1 / FPS }, { keys: [], secs: 0.25 }, { keys: [], taps: ['KeyK'], secs: 1 / FPS }, { keys: [], secs: 0.9 }] },
  hurt: { setup: 'CAP.reset([6194,4],0)', steps: [{ keys: [], secs: 0.1 }, { eval: 'CAP.G.hero.damage(1, {x: CAP.G.hero.pos.x, z: CAP.G.hero.pos.z + 2})', keys: [], secs: 1 / FPS }, { keys: [], secs: 1.0 }] },
  hurtSide: { setup: 'CAP.reset([6194,4],0)', steps: [{ keys: [], secs: 0.1 }, { eval: 'CAP.G.hero.damage(1, {x: CAP.G.hero.pos.x + 2, z: CAP.G.hero.pos.z})', keys: [], secs: 1 / FPS }, { keys: [], secs: 1.0 }] },
  // locked on: strafe right, then back, then circle (the body keeps facing the target)
  strafe: { setup: "CAP.reset([6194,2],0,['a_dummy']); CAP.put('a_dummy',6194,8); CAP.G.camRig.yaw = Math.PI; CAP.G.targeting.lock = CAP.G.enemies.find(e=>e.id==='a_dummy')", steps: [{ keys: [], secs: 0.2 }, { keys: ['KeyD'], secs: 1.2 }, { keys: [], secs: 0.5 }, { keys: ['KeyS'], secs: 1.0 }, { keys: [], secs: 0.5 }] },
  // the lock jumps to a target 120° round: the turn toward it, standing
  lockTurn: { setup: "CAP.reset([6194,2],0,['a_dummy']); CAP.put('a_dummy',6199,-1); CAP.G.camRig.yaw = Math.PI", steps: [{ keys: [], secs: 0.2 }, { eval: "CAP.G.targeting.lock = CAP.G.enemies.find(e=>e.id==='a_dummy')", keys: [], taps: ['KeyF'], secs: 1 / FPS }, { keys: [], secs: 1.0 }] },
};

for (const name of seqs) {
  const S = SEQ[name]; if (!S) { console.log('unknown seq', name); continue; }
  await page.evaluate((s) => { eval(s); }, S.setup);
  const samples = []; let n = 0;
  const dt = 1 / FPS;
  for (const st of S.steps) {
    if (st.eval) await page.evaluate((s) => { eval(s); }, st.eval);
    const steps = Math.max(1, Math.round(st.secs * FPS));
    for (let i = 0; i < steps; i++) {
      const s = await page.evaluate(([k, t, d]) => CAP.step(k, d, t), [st.keys, i === 0 ? st.taps || [] : [], dt]);
      samples.push(s);
      if (SHOTS && n % EVERY === 0) {
        const sc = await page.evaluate((v) => CAP.shot(v), VIEW);
        const cx = Math.max(0, Math.min(900 - 220, sc[0] - 110)), cy = Math.max(0, Math.min(560 - 250, sc[1] - 128));
        await page.screenshot({ path: `${OUT}/${name}-${String(n).padStart(3, '0')}.png`, clip: { x: cx, y: cy, width: 220, height: 250 } });
        s.shot = n;
      }
      n++;
    }
  }
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify({ name, fps: FPS, view: VIEW, samples }));
  console.log('captured', name, samples.length, 'steps');
}
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no errors');
await browser.close();
