// Prompts and the pad, and NPC walking (review fixes):
//   1. the interact prompt names the key in use: E, a rebound key, A on a pad (one source: Input.label)
//   2. pad A talks / searches when something is in reach, in every behaviour (Athletic does not jump instead)
//   3. an NPC's gait follows the ground it really covers: a slow route walks slower, a blocked walker stands
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
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.step(1.2);
  // a fake standard gamepad (navigator.getGamepads is what Input polls)
  window.PAD = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  window.atCupboard = () => { const s = G.room.searches.find((x) => x.id === 'cupboard'); const h = G.hero; h.pos.set(s.x + 0.3, 0, s.z); h.angle = -Math.PI / 2; h.vel?.set(0, 0); h.onGround = true; G.step(0.2); };
});

// ---------------------------------------------------------------- 1. prompt labels
const label = () => ev(() => { game.step(0.1); const p = document.querySelector('#prompt'); return { show: p.classList.contains('show'), key: p.querySelector('kbd')?.textContent }; });
await ev(() => atCupboard());
const kbd = await label();
await ev(() => { game.settings.keys = { interact: 'KeyG' }; game.applySettings(); });
const rebound = await label();
await ev(() => { game.settings.keys = {}; game.applySettings(); navigator.getGamepads = () => [PAD]; PAD.axes = [0.5, 0, 0, 0]; game.step(0.05); PAD.axes = [0, 0, 0, 0]; atCupboard(); });
const pad = await label();
check('prompt shows W on the keyboard (Classic: LBA2 talks and searches with W)', kbd.show && kbd.key === 'W', kbd);
check('prompt shows the rebound key', rebound.show && rebound.key === 'G', rebound);
check('prompt shows A on a pad', pad.show && pad.key === 'A', pad);

// ---------------------------------------------------------------- 2. pad A interacts in Athletic
const padA = await ev(() => {
  const G = game; G.hero.behaviour = 'athletic'; atCupboard();
  const y0 = G.hero.pos.y;
  PAD.buttons[0] = { pressed: true }; G.step(1 / 60); PAD.buttons[0] = { pressed: false }; G.step(0.1);
  const r = { state: G.state, dy: +(G.hero.pos.y - y0).toFixed(2), dev: G.input.lastDevice };
  for (let i = 0; i < 40 && G.state !== 'play'; i++) { PAD.buttons[0] = { pressed: i % 2 === 0 }; G.step(0.05); }
  PAD.buttons[0] = { pressed: false }; G.step(0.2);
  r.ball = G.hero.hasBall; G.hero.behaviour = 'normal';
  return r;
});
check('pad A searches the cupboard in Athletic instead of jumping', padA.state === 'dialog' && padA.dy < 0.05 && padA.ball, padA);
// away from anything, A in Athletic still jumps
const jump = await ev(() => {
  const G = game; G.hero.behaviour = 'athletic'; const h = G.hero, c = G.rooms.house.center; h.pos.set(c.x, 0, c.z); h.onGround = true; G.step(0.3);
  const near = !!G.findInteractable(), y0 = h.pos.y;
  PAD.buttons[0] = { pressed: true }; G.step(1 / 60); PAD.buttons[0] = { pressed: false }; G.step(0.15);
  const r = { near, dy: +(h.pos.y - y0).toFixed(2) }; G.step(1); G.hero.behaviour = 'normal'; navigator.getGamepads = () => []; G.input.lastDevice = 'kbd';
  return r;
});
check('pad A with nothing in reach still jumps in Athletic', !jump.near && jump.dy > 0.2, jump);

// ---------------------------------------------------------------- 3. NPC gait
const gait = await ev(() => {
  const G = game, n = G.npcs.find((x) => x.def.id === 'arthur'), P = G.physics, out = {};
  // walk him outdoors, away from Twinsen (he is in the house)
  const run = (speed, block) => {
    const x0 = n.pos.x, z0 = n.pos.z;
    n.placeAt({ x: x0, z: z0, track: [{ op: 'goto', x: x0 + 40, z: z0, speed }] });
    const mv = P.move; if (block) P.move = (a, dx, dz) => (a === n ? undefined : mv.call(P, a, dx, dz));
    let anim = null; const sp = [], ps = [];
    for (let i = 0; i < 60; i++) { G.frame(1 / 60, false); sp.push(n.gait); ps.push([n.pos.x, n.pos.z]); anim = n.rig.anim; }
    P.move = mv;
    // the real speed over the last 1/6 s (collisions can slow him on the way)
    const a = ps.at(-11), b = ps.at(-1), real = Math.hypot(b[0] - a[0], b[1] - a[1]) * 6;
    n.placeAt({ x: x0, z: z0, track: null, anim: 'kneelWork' });
    return { real: +real.toFixed(2), gait: +(sp.slice(-10).reduce((s, v) => s + v, 0) / 10).toFixed(2), anim };
  };
  out.normal = run(1); out.slow = run(0.5); out.blocked = run(1, true);
  return out;
});
check('NPC gait matches the real speed', Math.abs(gait.normal.gait - gait.normal.real) < 0.15 && gait.normal.anim === 'walk', gait.normal);
check('a slow route walks slower', gait.slow.gait < gait.normal.gait * 0.65 && gait.slow.anim === 'walk', gait.slow);
check('a blocked walker stands instead of walking on the spot', gait.blocked.real < 0.05 && gait.blocked.anim !== 'walk', gait.blocked);

console.log(errs.length ? errs.slice(0, 10).join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
