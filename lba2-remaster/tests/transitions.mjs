// Scene changes (src/main.js startTransition): through a door the hero walks on into it while the screen fades out
// and walks in on the other side while it fades back in; a scene change that isn't a door (a story cut) doesn't
// walk; in real time the screen holds black while the new scene's shaders compile, then fades in.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : JSON.stringify(info)); };
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await page.evaluate(() => { localStorage.clear(); game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 180000 });
const r = await page.evaluate(() => {
  const G = game, h = G.hero, out = {};
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3);
  // samples through a transition: [fade time, room, anim, x, z]
  const run = () => { const s = []; for (let i = 0; i < 70; i++) { G.step(1 / 60); s.push([G.trans ? G.trans.t : null, G.room?.id || 'out', h.rig.anim, h.pos.x, h.pos.z]); } return s; };
  const moved = (s, from, to) => { const a = s[from], b = s[to]; return Math.hypot(b[3] - a[3], b[4] - a[4]); };
  const into = (x, z, tx, tz) => { h.angle = Math.atan2(tx - x, tz - z); h.pos.set(x, G.physics.groundAt(x, z, h.pos.y + 3), z); h.onGround = true; G.doorCool = 0; };
  // in through Twinsen's front door
  G.exitRoom({ x: -45.6, z: 84, a: Math.PI }, true); G.step(1);
  const d = G.story.doors().find((x) => x.room === 'house');
  into(d.x, d.z + d.r - 0.1, d.x, d.z);
  let s = run();
  const mid = s.findIndex((x) => x[1] === 'house'), end = s.findIndex((x, i) => i > mid && x[0] === null);
  out.in = { room: G.room?.id, before: moved(s, 0, mid - 1), after: moved(s, mid, end), walking: s.slice(2, end).every((x) => x[2] === 'walk'), settled: h.rig.anim === 'idle' };
  // out of Bersimon's tent (an exit to Citadel)
  G.enterRoom('wtent', null, true); G.step(0.5);
  const R = G.rooms.wtent, e = R.exits[0], dx = R.spawn.x - e.x, dz = R.spawn.z - e.z, L = Math.hypot(dx, dz);
  into(e.x + dx / L * (e.r - 0.1), e.z + dz / L * (e.r - 0.1), e.x, e.z);
  s = run();
  const m2 = s.findIndex((x) => x[1] === 'out');
  out.out = { room: G.room?.id ?? 'citadel', before: moved(s, 0, m2 - 1), after: moved(s, m2, 60) };
  // a scene change that isn't a door: no walk
  const p0 = h.pos.clone();
  G.enterRoom('wtent'); s = run();
  out.cut = { room: G.room?.id, walk: s.some((x) => x[2] === 'walk'), drift: Math.hypot(h.pos.x - R.spawn.x, h.pos.z - R.spawn.z) };
  void p0;
  return out;
});
check('through a door: the hero walks on into it while the screen darkens', r.in.room === 'house' && r.in.before > 0.3 && r.in.walking, r.in);
check('and walks in on the other side while it clears, then stands', r.in.after > 0.3 && r.in.after < 1.6 && r.in.settled, r.in);
check('out through an exit: the same, onto Citadel', r.out.room === 'citadel' && r.out.before > 0.3 && r.out.after > 0.3, r.out);
check('a scene change that is not a door: no walk', r.cut.room === 'wtent' && !r.cut.walk && r.cut.drift < 0.05, r.cut);
// real time: the screen holds black while the shaders compile, then fades in
const rt = await page.evaluate(async () => {
  const G = game, h = G.hero;
  G.enterRoom('house', null, true); G.step(0.5);
  const e = G.rooms.house.exits.find((x) => x.room === 'cellar');
  h.pos.set(e.x, G.physics.groundAt(e.x, e.z, h.pos.y + 3), e.z); G.doorCool = 0;
  G.testFreeze = false;
  const s = [], t0 = performance.now();
  await new Promise((res) => { const tick = () => { const T = G.trans; s.push([T ? T.t : null, !!T?.hold, +(document.querySelector('#fade').style.opacity || 0), G.room?.id]); if (performance.now() - t0 < 20000 && (T || performance.now() - t0 < 500)) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
  G.testFreeze = true;
  const held = s.filter((x) => x[1]);
  return { room: G.room?.id, held: held.length, heldBlack: held.every((x) => x[2] === 1), done: s[s.length - 1][0] === null, maxJump: Math.max(...s.slice(1).map((x, i) => (x[0] ?? 0.7) - (s[i][0] ?? 0))) };
});
check('real time: black while the new room compiles, then the fade-in runs in full', rt.room === 'cellar' && rt.held > 0 && rt.heldBlack && rt.done && rt.maxJump <= 0.11, rt);
console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
