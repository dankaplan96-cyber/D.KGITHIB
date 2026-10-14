// The new-game opening (src/game/story/opening.js on src/engine/cinematic.js):
//   1. it plays through and hands over in the house: control, the first objective, the save, the cast placed
//   2. skipping at the start, during the dialogue and during the title ends in the same state
//   3. pause / resume stops the clock (and the sound)
//   4. Continue from the save after the opening: no replay
//   5. a second new game: no duplicated props, characters or flags
//   6. the first objective is playable (the door wants the ball; the cupboard gives it)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' ' + JSON.stringify(info) : ''}`); if (!ok) fails++; };

const boot = async (mode, clear = true) => {
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/'), { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  if (clear) await ev(() => localStorage.clear());
  await ev(() => { game.testFreeze = true; });
  if (mode === 'new') {
    await page.click('[data-act="new"]', { timeout: 180000 });
    await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 240000 });
  } else if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
};
// advance the game clock by s seconds at 30 fps
const run = (s) => ev((s) => { for (let i = 0, n = Math.round(s * 30); i < n; i++) game.frame(1 / 30, false); }, s);
const runTo = (t) => ev((t) => { for (let i = 0; i < 6000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false); return game.cine?.t; }, t);
const holdSkip = async () => {
  await page.keyboard.down('KeyE');
  await run(1.2);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(700); // (the skip's dip to black)
  await run(0.2);
};
// the state the opening must leave, however it ended
const endState = () => ev(() => {
  const G = game, f = G.flags, zoe = G.npcs.find((n) => n.def.id === 'zoe'), ar = G.npcs.find((n) => n.def.id === 'arthur');
  const water = G.world.houses.find((h) => h.id === 'nbr'); // (Zoé's "next door": the neighbours by Twinsen's house)
  const save = JSON.parse(localStorage.getItem('lba3_save_v1') || 'null');
  return {
    state: G.state, room: G.room?.id, cine: !!G.cine, camCine: !!G.camRig.cine, hud: !document.querySelector('#hud').classList.contains('hidden'),
    cineUI: !document.querySelector('#cine').classList.contains('hidden'), fade: document.querySelector('#fade').classList.contains('on'),
    intro: !!f.intro, opening: !!f.opening, ball: !!G.hero.hasBall,
    objective: document.querySelector('#objective').textContent.trim(),
    zoeOut: zoe.present && Math.hypot(zoe.pos.x - water.door.x, zoe.pos.z - water.door.z) < 2, zoeControlled: !!zoe.controlled,
    arthur: [ar.forceAnim, !!ar.controlled], hero: [+(G.hero.pos.x - G.rooms.house.center.x).toFixed(2), +G.hero.pos.z.toFixed(2)],
    lift: +G.world.cargoLift.u.toFixed(2), stream: G.rooms.house.kitchen.stream.visible, sd: G.rooms.house.table.screwdriver.parent === G.rooms.house.group,
    saved: !!save?.flags?.opening, savedRoom: save?.room,
    sceneKids: G.scene.children.length,
  };
});
const good = (s) => s.state === 'play' && s.room === 'house' && !s.cine && !s.camCine && s.hud && !s.cineUI && !s.fade && s.intro && s.opening && !s.ball
  && s.objective === 'Check the well' && s.zoeOut && !s.zoeControlled && s.arthur[0] === 'kneelWork' && !s.arthur[1] && s.lift === 1 && !s.stream && s.sd && s.saved && s.savedRoom === 'house';

// ---------------------------------------------------------------- 1. full playback
await boot('new');
const during = await ev(() => ({ state: game.state, hud: !document.querySelector('#hud').classList.contains('hidden'), prompt: document.querySelector('#prompt')?.classList.contains('show') ?? false, saved: !!localStorage.getItem('lba3_save_v1') }));
check('opening starts as a cinematic with the HUD hidden and nothing saved', during.state === 'cinematic' && !during.hud && !during.prompt && !during.saved, during);
await runTo(30);
const mid = await ev(() => ({ room: game.room?.id, saved: !!localStorage.getItem('lba3_save_v1'), sub: document.querySelector('#cine-sub').textContent }));
check('the scene moves to the house; still nothing saved mid-scene', mid.room === 'house' && !mid.saved, mid);
await runTo(46);
const sub = await ev(() => document.querySelector('#cine-sub').textContent);
check('subtitles with the speaker', sub.startsWith('Zoé') && sub.includes("The tap's stopped again"), sub);
await runTo(100);
await run(0.5);
const full = await endState();
check('played through: control in the house, objective, save, cast placed', good(full), full);
const kids0 = full.sceneKids;

// ---------------------------------------------------------------- 2. skipping
for (const at of [3, 50, 81]) {
  await boot('new');
  await runTo(at);
  await holdSkip();
  const s = await endState();
  check(`skip at ${at}s ends in the same state`, good(s) && s.sceneKids === kids0, s);
}
// a short press does not skip
await boot('new');
await runTo(5);
await page.keyboard.down('KeyE'); await run(0.3); await page.keyboard.up('KeyE'); await run(0.5);
check('a short press does not skip', await ev(() => game.state === 'cinematic' && game.cine?.state === 'run'));

// ---------------------------------------------------------------- 3. pause / resume
await runTo(20);
await page.keyboard.press('Escape');
await run(0.1);
const p0 = await ev(() => ({ state: game.state, paused: game.cine?.paused, t: game.cine?.t, screen: !document.querySelector('#pause').classList.contains('hidden') }));
await run(2);
const p1 = await ev(() => game.cine?.t);
check('pause stops the scene clock and shows the pause menu', p0.state === 'pause' && p0.paused && p0.screen && Math.abs(p1 - p0.t) < 1e-6, { p0, p1 });
await page.click('#pause [data-act="resume"]');
await run(1);
const p2 = await ev(() => ({ state: game.state, paused: game.cine?.paused, t: game.cine?.t }));
check('resume continues the scene', p2.state === 'cinematic' && !p2.paused && p2.t > p1 + 0.5, p2);
// lost focus pauses too
await ev(() => window.dispatchEvent(new Event('blur')));
check('losing window focus pauses the scene', await ev(() => game.state === 'pause' && game.cine?.paused));
await page.click('#pause [data-act="resume"]');
await runTo(100); await run(0.5);
check('...and it still ends cleanly', good(await endState()));

// ---------------------------------------------------------------- 4. continue after the opening
await boot('continue', false);
await run(1.5);
const cont = await endState();
check('continue: no replay, in the house with the objective', cont.state === 'play' && !cont.cine && cont.room === 'house' && cont.objective === 'Check the well' && cont.zoeOut && cont.arthur[0] === 'kneelWork', cont);

// ---------------------------------------------------------------- 5. new game again (from the title, with a save present)
await boot('new', false);
await holdSkip();
const again = await endState();
const dup = await ev(() => ({ zoes: game.npcs.filter((n) => n.def.id === 'zoe').length, lifts: (() => { let n = 0; game.world.root.traverse((o) => { if (o.name === 'cargoLift') n++; }); return n; })() }));
check('a second new game: same end state, nothing duplicated', good(again) && again.sceneKids === kids0 && dup.zoes === 1 && dup.lifts === 1, { again, dup });

// ---------------------------------------------------------------- 6. the first objective is playable
const blocked = await ev(() => {
  const G = game, e = G.room.exits.find((x) => x.to === 'outdoor');
  G.step(1.2); // (doors wait a moment after a room change)
  G.hero.pos.set(e.x, 0, e.z); G.step(0.5);
  const st = G.state;
  for (let i = 0; i < 40 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  return { st, room: G.room?.id, hint: !!G.flags.ballHint, obj: document.querySelector('#objective').textContent };
});
check('without the ball the door holds him, with a hint', blocked.st === 'dialog' && blocked.room === 'house' && blocked.hint && blocked.obj.includes('cupboard'), blocked);
const took = await ev(() => {
  const G = game, s = G.room.searches.find((x) => x.id === 'cupboard');
  G.hero.pos.set(s.x + 0.3, 0, s.z); G.hero.angle = -Math.PI / 2; G.step(0.3);
  G.input.taps.add('KeyE'); G.step(0.1);
  for (let i = 0; i < 40 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  const e = G.room.exits.find((x) => x.to === 'outdoor');
  G.hero.pos.set(e.x, 0, e.z); G.step(2.0);
  return { ball: G.hero.hasBall, room: G.room?.id ?? 'outdoors', obj: document.querySelector('#objective').textContent };
});
check('the cupboard gives the ball and the door lets him out', took.ball && took.room === 'outdoors' && took.obj.startsWith('Check the well'), took);

console.log(errs.length ? errs.slice(0, 10).join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
