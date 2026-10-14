// Frame-rate independence and instrumentation (review fixes), in the developer arena, driving the real loop
// body (game.advance(realSeconds)) as rAF would at a given frame rate:
//   1. walking distance and a sword swing's duration are the same at 60, 30, 20, 15 and 10 fps
//      (before: dt was clamped to 50 ms, so below 20 fps everything ran in slow motion)
//   2. a long stall is dropped, not caught up (bounded steps), and the next frames are normal
//   3. a press on a slow frame (several steps) acts once
//   4. a volume slider event rebuilds nothing and does not cut the camera; a quality change does resize
//   5. game.perf.stats() and game.loadTimes report sensible numbers
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== '' ? ' ' + JSON.stringify(info) : ''}`); if (!ok) fails++; };

await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await ev(() => {
  const G = window.game; G.testFreeze = true; G.settings.controls = 'modern'; G.applySettings(); // (WASD walks)
  G.devArena();
  window.X = {
    // run `seconds` of real time at `fps`, through the loop's own real-time → simulation path (no render here:
    // the swiftshader renderer is too slow to matter; Game.advance renders on the last step of each frame)
    run(seconds, fps, each) { const n = Math.round(seconds * fps); for (let i = 0; i < n; i++) { X.adv(1 / fps); each?.(i); } },
    adv(real) { const f = G.frame.bind(G); G.frame = (dt, render) => f(dt, false); try { G.advance(real); } finally { G.frame = f; } },
    reset(a = 0) {
      const h = G.hero; h.pos.set(6190, G.physics.groundAt(6190, 8), 8); h.angle = a; h.vel?.set(0, 0); h.hp = h.maxHp; h.actT = 0; h.hurtT = 0;
      for (const e of G.enemies) if (e.id?.startsWith('a_')) e.setPresent(false);
      G.resetCombat(); G.state = 'play'; G.input.keys.clear(); G.step(0.3);
    },
  };
});

// ---------------------------------------------------------------- 1. distance and duration across frame rates
const rates = [60, 30, 20, 15, 10];
const fr = await ev((rates) => {
  const G = game, h = G.hero, out = {};
  for (const fps of rates) {
    X.reset(0);
    const x0 = h.pos.x, z0 = h.pos.z;
    G.input.keys.add('KeyW'); X.run(1.0, fps); G.input.keys.delete('KeyW');
    const walk = Math.hypot(h.pos.x - x0, h.pos.z - z0);
    X.reset(0); X.run(0.2, fps);
    h.combat.equip('sword', true);
    G.input.keys.add('KeyK'); G.input.taps.add('KeyK'); X.adv(1 / fps); G.input.keys.delete('KeyK');
    let t = 1 / fps; while (h.combat.busy && t < 3) { X.adv(1 / fps); t += 1 / fps; }
    out[fps] = { walk: +walk.toFixed(2), swing: +t.toFixed(3) };
  }
  // what the old loop did (dt clamped to 50 ms, nothing else) at 10 fps, for the record
  X.reset(0); const x0 = h.pos.x, z0 = h.pos.z;
  G.input.keys.add('KeyW'); for (let i = 0; i < 10; i++) G.frame(Math.min(0.05, 1 / 10), false); G.input.keys.delete('KeyW');
  out.old10 = { walk: +Math.hypot(h.pos.x - x0, h.pos.z - z0).toFixed(2) };
  return out;
}, rates);
const ref = fr[60];
for (const fps of rates.slice(1)) {
  check(`${fps} fps: walking covers the same ground in 1 s as at 60`, Math.abs(fr[fps].walk - ref.walk) / ref.walk < 0.06, { at60: ref, ['at' + fps]: fr[fps] });
  check(`${fps} fps: a sword swing lasts as long as at 60`, Math.abs(fr[fps].swing - ref.swing) <= 1 / fps + 0.02, { at60: ref.swing, ['at' + fps]: fr[fps].swing });
}
console.log('       (the old loop at 10 fps walked', fr.old10.walk, 'm in 1 s against', ref.walk, 'at 60)');

// ---------------------------------------------------------------- 2. a stall
const stall = await ev(() => {
  const G = game, h = G.hero; X.reset(0); G.perf.reset();
  G.input.keys.add('KeyW'); X.run(0.5, 60);
  const p0 = h.pos.clone(); X.adv(1.5); const jump = h.pos.distanceTo(p0);
  const s1 = G.perf.stats(1);
  const p1 = h.pos.clone(); X.run(0.25, 60); const after = h.pos.distanceTo(p1) / 0.25;
  G.input.keys.delete('KeyW');
  return { jump: +jump.toFixed(2), steps: s1.steps.max, lost: s1.lostS, speedAfter: +after.toFixed(2) };
});
check('a 1.5 s stall is simulated as at most 4 steps; the rest is dropped', stall.steps === 4 && stall.lost > 1.3 && stall.jump < 0.4, stall);
check('...and the frames after it move at normal speed', stall.speedAfter > 2 && stall.speedAfter < 2.7, stall);

// ---------------------------------------------------------------- 3. one press on a slow frame acts once
const once = await ev(() => {
  const G = game, h = G.hero, B = G.ball, orig = B.launch.bind(B); let n = 0;
  X.reset(0); h.combat.equip('fists', true);
  B.launch = (...a) => { n++; return orig(...a); };
  G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); X.adv(1 / 8); G.input.keys.delete('KeyF');
  X.run(1.0, 8); B.launch = orig;
  const jumps = []; h.behaviour = 'athletic'; X.reset(0);
  let air = 0, was = true;
  G.input.keys.add('Space'); G.input.taps.add('Space'); X.adv(1 / 8); G.input.keys.delete('Space');
  for (let i = 0; i < 24; i++) { X.adv(1 / 8); if (was && !h.onGround) air++; was = h.onGround; }
  h.behaviour = 'normal';
  return { throws: n, takeoffs: air };
});
check('a ball press during a 3-step frame throws once', once.throws === 1, once);
check('a jump press during a 3-step frame jumps once', once.takeoffs <= 1, once);

// ---------------------------------------------------------------- 4. settings
const set = await ev(() => {
  const G = game, el = document.querySelector('[data-range="music"]'), R = G.renderer, ms = [];
  let cuts = 0; const size0 = R._size;
  for (let i = 0; i < 20; i++) { G.camRig.lba.init = true; el.value = String(0.3 + (i % 5) * 0.1); const t0 = performance.now(); el.dispatchEvent(new Event('input')); ms.push(performance.now() - t0); if (!G.camRig.lba.init) cuts++; }
  ms.sort((a, b) => a - b);
  const sameSize = R._size === size0;
  G.settings.quality = 'medium'; G.applySettings(); const medium = R._size, shadow = G.env.sun.shadow.mapSize.x;
  G.settings.quality = 'high'; G.applySettings();
  return { median: +ms[10].toFixed(2), max: +ms[19].toFixed(2), cuts, sameSize, resizedOnQuality: medium !== size0 && R._size === size0, shadowMedium: shadow, music: G.audio.vol.music };
});
check('a volume slider event costs little and rebuilds nothing', set.median < 1 && set.sameSize && Math.abs(set.music - 0.7) < 1e-9, set);
check('a volume slider event does not cut the camera', set.cuts === 0, set);
check('a quality change still resizes and sets the shadow map', set.resizedOnQuality && set.shadowMedium === 1024, set);

// ---------------------------------------------------------------- 5. instrumentation
const inst = await ev(() => {
  const G = game; G.perf.reset();
  for (let i = 0; i < 30; i++) G.advance(1 / 30); // with rendering
  return { stats: G.perf.stats(), load: G.loadTimes };
});
const L = inst.load, S = inst.stats;
check('perf.stats: frames, fps, sim/render split and draw calls', S.frames === 30 && Math.abs(S.fps - 30) < 0.5 && S.renderMs.p50 > 0 && S.calls > 0 && S.tris > 0, S);
check('loadTimes: each region timed on its own', ['world', 'interiors', 'zeelich', 'underground', 'desert', 'condenser', 'hamalayi', 'upper', 'arena', 'actors', 'total'].every((k) => L[k] >= 0) && L.total >= L.world, L);

console.log(errs.length ? errs.slice(0, 10).join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
