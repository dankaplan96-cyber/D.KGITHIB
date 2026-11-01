// ANIM-POLISH capture: Twinsen's starts, stops, turns on the spot, landings and melee strikes played by input in chapter 1's
// Citadel (outside his house) or in his house (ROOM=house), at a fixed step; every step's pose numbers, feet, hands and
// clocks to <OUT>/<seq>.json, crops of the side (or game) view to <OUT>/<seq>-NNN.png, and metrics to stdout.
// usage: GAME_URL=http://localhost:8711/ OUT=<dir> FPS=60 SHOTS=1 VIEW=side node cap.mjs <seq> [<seq> ...]
// seqs: walkStop runStop turnL turnR turnRun jump drop drop2 step fists sword idle (see SEQ)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '.';
const FPS = +(process.env.FPS || 60);
const SHOTS = process.env.SHOTS !== '0';
const EVERY = +(process.env.SHOT_EVERY || Math.max(1, Math.round(FPS / 20)));
const VIEW = process.env.VIEW || 'side';
const ROOM = process.env.ROOM || 'out';
const seqs = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
page.setDefaultTimeout(600000);
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); else if (/^HOME/.test(m.text())) console.log(m.text()); });
await page.goto((process.env.GAME_URL || 'http://localhost:8711/') + '?nocine', { waitUntil: 'load', timeout: 600000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 900000 });
await page.evaluate(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 600000 });
await page.evaluate(([ROOM, HOME, process_HEADING]) => {
  window.__HOME = HOME; window.__HEADING = process_HEADING !== '' ? process_HEADING : 1.0;   // (across the square's clear side, the well behind him)
  const G = window.game; G.testFreeze = true;
  const talkAll = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
  talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); talkAll();
  if (ROOM !== 'out') { G.enterRoom(ROOM, null, true); G.step(0.5); talkAll(); }
  G.settings.controls = 'classic'; G.applySettings();
  document.querySelectorAll('#hud, .hud, #objective, #prompt').forEach((e) => (e.style.display = 'none'));
  const V = G.hero.pos.constructor;
  const wp = (o) => { const v = new V(); o.updateWorldMatrix(true, false); o.getWorldPosition(v); return v; };
  // a clear, flat spot: outside, 4 m in front of his own door; in the house, its centre
  const home = (() => {
    if (ROOM !== 'out') { const c = G.room.spawn || G.room.center || G.hero.pos; return [c.x, c.z, c.a ?? 0]; }
    const at = (window.__HOME || '').split(',').map(Number);
    if (at.length === 3 && at.every(Number.isFinite)) return at;
    // the clearest flat spot within 30 m of where chapter 1 puts him: no one within 7 m, the ground level within 3 cm over
    // 3.5 m round, 4 m free to walk every way
    const h = G.hero, x0 = h.pos.x, z0 = h.pos.z, P = G.physics, probe = { pos: new V(), radius: 0.4, onGround: true };
    let best = null;
    for (let dx = -30; dx <= 30; dx += 2) for (let dz = -30; dz <= 30; dz += 2) {
      const x = x0 + dx, z = z0 + dz, y = P.groundAt(x, z);
      if (y < 0.05) continue;
      let ok = true;
      for (let a = 0; a < 8 && ok; a++) for (const r of [1.75, 3.5]) { const yy = P.groundAt(x + Math.sin(a * 0.785) * r, z + Math.cos(a * 0.785) * r); if (Math.abs(yy - y) > 0.03) ok = false; }
      if (!ok) continue;
      for (const n of G.npcs || []) if (n.present !== false && Math.hypot(n.pos.x - x, n.pos.z - z) < 7) ok = false;
      if (!ok) continue;
      for (let a = 0; a < 8 && ok; a++) { probe.pos.set(x, y, z); P.move(probe, Math.sin(a * 0.785) * 4, Math.cos(a * 0.785) * 4); if (Math.hypot(probe.pos.x - x - Math.sin(a * 0.785) * 4, probe.pos.z - z - Math.cos(a * 0.785) * 4) > 0.05) ok = false; }
      if (!ok) continue;
      const d = Math.hypot(dx, dz); if (!best || d < best[3]) best = [x, z, 0, d];
    }
    return best ? best.slice(0, 3) : [x0, z0, h.angle];
  })();
  console.log('HOME', home.join(','));
  window.CAP = {
    G, home,
    reset(a = +(window.__HEADING ?? home[2]), beh = 'normal', controls = 'classic') {
      if (G.hero.rig.silhouette) G.hero.rig.silhouette.visible = false;   // (no see-through tint in the side views)
      const h = G.hero; G.settings.controls = controls; G.applySettings();
      h.behaviour = beh;
      h.pos.set(home[0], G.physics.groundAt(home[0], home[1]), home[1]); h.angle = a; h.vel.set(0, 0); h.fwdSpeed = 0; h.vy = 0; h.onGround = true;
      h.hp = h.maxHp; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0; h.hasBall = true; h.hasSword = true;
      // (the townsfolk who wander within 10 m stand aside for the capture: none walks between the camera and him)
      for (const n of G.npcs || []) if (Math.hypot(n.pos.x - home[0], n.pos.z - home[1]) < 10) n.setPresent?.(false);
      G.resetCombat?.(); G.state = 'play'; G.targeting?.release?.();
      G.input.keys.clear(); G.input.taps?.clear?.();
      for (let i = 0; i < 90; i++) G.frame(1 / 60, false);
      this.t = 0; this.camA = null; this.cx = h.pos.x; this.cz = h.pos.z;
    },
    sample(dt) {
      const h = G.hero, r = h.rig, j = r.j, c = h.combat;
      const P = (o) => { const v = wp(o); return [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)]; };
      const rot = {};
      for (const [k, o] of Object.entries({ hip: j.hips, torso: j.torso, head: j.head, body: j.body, shL: j.armL.sh, shR: j.armR.sh, elL: j.armL.el, elR: j.armR.el, legL: j.legL.hip, legR: j.legR.hip, knL: j.legL.knee, knR: j.legR.knee, ftL: j.legL.foot, ftR: j.legR.foot }))
        if (o) rot[k] = [+o.rotation.x.toFixed(4), +o.rotation.y.toFixed(4), +o.rotation.z.toFixed(4)];
      const blade = h.swordMesh?.visible ? (() => { const v = new V(0, -0.75, 0); h.swordMesh.updateWorldMatrix(true, false); return v.applyMatrix4(h.swordMesh.matrixWorld); })() : null;
      return {
        t: +this.t.toFixed(4), dt, anim: r.anim, actionT: +r.actionT.toFixed(3),
        pos: [+h.pos.x.toFixed(4), +h.pos.y.toFixed(4), +h.pos.z.toFixed(4)], angle: +h.angle.toFixed(4), speed: +h.speed.toFixed(3), onGround: h.onGround, vy: +(h.vy || 0).toFixed(3),
        handR: P(j.armR.hand), handL: P(j.armL.hand), footL: P(j.legL.foot), footR: P(j.legR.foot), head: P(j.head), hips: P(j.hips), rot,
        blade: blade ? [+blade.x.toFixed(4), +blade.y.toFixed(4), +blade.z.toFixed(4)] : null,
        ground: +G.physics.groundAt(h.pos.x, h.pos.z, h.pos.y + 0.5).toFixed(4),
        move: c.move ? { key: c.move.key, t: +c.move.t.toFixed(4), s: c.move.def.s, a: c.move.def.a, hits: c.move.hit.size, landed: !c.move.pending?.length && c.move.hit.size > 0 } : null,
        landT: +(r.landT || 0).toFixed(3), landS: +(r.landS || 0).toFixed(2),
        plant: r._feet ? ['L', 'R'].map((k) => { const f = r._feet[k]; return (f.on ? (f.stepping ? 'S' : 'P') : '-') + (+f.w.toFixed(2)); }).concat(+r._feet.w.toFixed(2)) : null,
      };
    },
    step(keys, dt, taps = []) {
      G.input.keys.clear(); for (const k of keys) G.input.keys.add(k); for (const k of taps) { G.input.keys.add(k); G.input.taps.add(k); }
      G.frame(dt, false); this.t += dt;
      for (const k of taps) if (!keys.includes(k)) G.input.keys.delete(k);
      return this.sample(dt);
    },
    shot(view) {
      const h = G.hero, c = G.camera, p = h.pos;
      if (this.camA == null) this.camA = h.angle;
      if (view === 'game') { G.camRig.update(0.016, h.pos, h.angle, false, null); }
      else {
        const a = this.camA + (view === 'front' ? 0 : view === 'back' ? Math.PI : view === 'q' ? -Math.PI / 4 : -Math.PI / 2), d = 9.5;
        c.fov = 34; c.near = d - 2.6; c.updateProjectionMatrix();   // (the near plane past anything between the camera and him)
        const follow = view !== 'fixed';
        const cx = follow ? p.x : this.cx, cz = follow ? p.z : this.cz;
        c.position.set(cx + Math.sin(a) * d, p.y + 1.5, cz + Math.cos(a) * d); c.lookAt(cx, p.y + 0.9, cz);
      }
      c.updateMatrixWorld();
      G.renderer.render();
      const v = p.clone(); v.y += 1.0; v.project(c);
      return [(v.x + 1) * 450, (1 - v.y) * 280];
    },
  };
}, [ROOM, process.env.HOME_AT || '', process.env.HEADING || '']);

const U = 'ArrowUp', L = 'ArrowLeft', R = 'ArrowRight';
const SEQ = {
  idle: { setup: 'CAP.reset()', steps: [{ keys: [], secs: 1.5 }] },
  // Classic walk: stand, walk forward 1.4 s, let go, stand
  walkStop: { setup: 'CAP.reset()', steps: [{ keys: [], secs: 0.25 }, { keys: [U], secs: 1.4 }, { keys: [], secs: 1.0 }] },
  runStop: { setup: "CAP.reset(undefined, 'athletic')", steps: [{ keys: [], secs: 0.25 }, { keys: [U], secs: 1.4 }, { keys: [], secs: 1.0 }] },
  // Modern walk (stick/WASD, camera-relative): the same start and stop
  walkStopM: { setup: "CAP.reset(undefined, 'normal', 'modern'); CAP.G.camRig.yaw = CAP.G.hero.angle + Math.PI", steps: [{ keys: [], secs: 0.25 }, { keys: ['KeyW'], secs: 1.4 }, { keys: [], secs: 1.0 }] },
  // Classic: turn on the spot (100°/s Normal), a half-turn, then stand
  turnL: { setup: 'CAP.reset()', steps: [{ keys: [], secs: 0.25 }, { keys: [L], secs: 1.8 }, { keys: [], secs: 0.8 }] },
  turnR: { setup: 'CAP.reset()', steps: [{ keys: [], secs: 0.25 }, { keys: [R], secs: 0.9 }, { keys: [], secs: 0.8 }] },
  // a short tap of the turn key (a 20° correction)
  turnTap: { setup: 'CAP.reset()', steps: [{ keys: [], secs: 0.25 }, { keys: [L], secs: 0.2 }, { keys: [], secs: 0.8 }] },
  turnAth: { setup: "CAP.reset(undefined, 'athletic')", steps: [{ keys: [], secs: 0.25 }, { keys: [L], secs: 1.1 }, { keys: [], secs: 0.8 }] },
  // Athletic: a standing jump, and a running one
  jump: { setup: "CAP.reset(undefined, 'athletic')", steps: [{ keys: [], secs: 0.25 }, { keys: [], taps: ['Space'], secs: 1 / FPS }, { keys: [], secs: 1.6 }] },
  jumpRun: { setup: "CAP.reset(undefined, 'athletic')", steps: [{ keys: [], secs: 0.1 }, { keys: [U], secs: 0.7 }, { keys: [U], taps: ['Space'], secs: 1 / FPS }, { keys: [U], secs: 0.95 }, { keys: [], secs: 0.8 }] },
  // a drop from 0.9 m / 2.0 m (the ground under a ledge, as the game drops him: P.fall from rest)
  drop: { setup: 'CAP.reset(); CAP.G.hero.pos.y += 0.9; CAP.G.hero.onGround = false; CAP.G.hero.airPeak = CAP.G.hero.pos.y', steps: [{ keys: [], secs: 1.4 }] },
  drop2: { setup: 'CAP.reset(); CAP.G.hero.pos.y += 2.0; CAP.G.hero.onGround = false; CAP.G.hero.airPeak = CAP.G.hero.pos.y', steps: [{ keys: [], secs: 1.6 }] },
  // the fist combo (K three times) and the sword combo, in the air in front of him (no target in chapter 1)
  fists: { setup: "CAP.reset(); CAP.G.hero.combat.equip('fists', true); CAP.G.hero.weapon = 'fists'", steps: [{ keys: [], secs: 0.2 }, { keys: [], taps: ['KeyK'], secs: 0.25 }, { keys: [], taps: ['KeyK'], secs: 0.25 }, { keys: [], taps: ['KeyK'], secs: 0.9 }] },
  // (ROOM=cellar, stairs@-1.5708) up the cellar stairs of his house (0.2 m treads), a stop, a half-turn on the spot, down again
  stairs: { setup: 'CAP.reset()', steps: [{ keys: [], secs: 0.2 }, { keys: [U], secs: 1.3 }, { keys: [], secs: 0.4 }, { keys: [L], secs: 1.8 }, { keys: [], secs: 0.3 }, { keys: [U], secs: 1.2 }, { keys: [], secs: 0.6 }] },
  sword: { setup: "CAP.reset(); CAP.G.hero.combat.equip('sword', true)", steps: [{ keys: [], secs: 0.2 }, { keys: [], taps: ['KeyK'], secs: 0.33 }, { keys: [], taps: ['KeyK'], secs: 0.33 }, { keys: [], taps: ['KeyK'], secs: 1.0 }] },
};

const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
function metrics(name, S) {
  // a foot within 3 cm of the ground and below the other counts as standing on it: how far it slides while it does
  const out = { name, frames: S.length };
  let skate = 0, skateMax = 0, skateAt = null, stepN = 0, liftMax = 0, popMax = 0, popAt = null;
  const lastUp = { L: false, R: false };
  for (let i = 1; i < S.length; i++) {
    const s = S[i], p = S[i - 1];
    for (const k of ['L', 'R']) {
      const f = s['foot' + k], fp = p['foot' + k], up = f[1] - s.ground, upP = fp[1] - p.ground;
      liftMax = Math.max(liftMax, up);
      const down = up < 0.115 && upP < 0.115;   // (the ankle joint sits ≈ 0.09 m above the sole)
      const d = dist2(f, fp);
      if (down && s.onGround && p.onGround) { skate += d; if (d / s.dt > skateMax) { skateMax = d / s.dt; skateAt = s.t; } }
      const isUp = up > 0.125; if (isUp && !lastUp[k]) stepN++; lastUp[k] = isUp;
    }
    for (const [k, v] of Object.entries(s.rot)) for (let a = 0; a < 3; a++) {
      const dd = Math.abs(v[a] - p.rot[k][a]) / (s.dt * 60);
      if (dd > popMax) { popMax = dd; popAt = [s.t, k, a]; }
    }
  }
  out.groundedFootTravelCm = +(skate * 100).toFixed(1);
  out.maxGroundedFootSpeed = +skateMax.toFixed(2); out.at = skateAt;
  out.footLifts = stepN; out.maxFootLiftCm = +(liftMax * 100).toFixed(1);
  out.maxJointStepPer60 = +popMax.toFixed(3); out.popAt = popAt;
  const hipsUp = S.map((s) => s.hips[1] - s.pos[1]);
  out.hipsMin = +Math.min(...hipsUp).toFixed(3); out.hipsMax = +Math.max(...hipsUp).toFixed(3);
  const yaw0 = S[0].angle, yaw1 = S[S.length - 1].angle; out.turnedDeg = +((yaw1 - yaw0) * 180 / Math.PI).toFixed(1);
  const anims = []; for (const s of S) if (anims[anims.length - 1]?.[0] !== s.anim) anims.push([s.anim, s.t]); out.anims = anims.map(([a, t]) => `${a}@${t.toFixed(2)}`).join(' ');
  return out;
}

for (const name of seqs) {
  // (name@heading: the same sequence facing another way, radians)
  const [base, hd] = name.split('@');
  const S = SEQ[base]; if (!S) { console.log('unknown seq', name); continue; }
  await page.evaluate((h) => { if (h != null) window.__HEADING = h; }, hd ?? null);
  await page.evaluate((s) => { eval(s); }, S.setup);
  const samples = []; let n = 0;
  const dt = 1 / FPS;
  for (const st of S.steps) {
    const steps = Math.max(1, Math.round(st.secs * FPS));
    for (let i = 0; i < steps; i++) {
      const s = await page.evaluate(([k, t, d]) => CAP.step(k, d, t), [st.keys, i === 0 ? st.taps || [] : [], dt]);
      samples.push(s);
      if (SHOTS && n % EVERY === 0) {
        const sc = await page.evaluate((v) => CAP.shot(v), VIEW);
        const cx = Math.max(0, Math.min(900 - 240, sc[0] - 120)), cy = Math.max(0, Math.min(560 - 270, sc[1] - 135));
        await page.screenshot({ path: `${OUT}/${name}-${String(n).padStart(3, '0')}.png`, ...(process.env.FULL ? {} : { clip: { x: cx, y: cy, width: 240, height: 270 } }) });
        s.shot = n;
      }
      n++;
    }
  }
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify({ name, fps: FPS, view: VIEW, room: ROOM, samples }));
  console.log('METRICS', JSON.stringify(metrics(name, samples)));
}
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no errors');
await browser.close();
