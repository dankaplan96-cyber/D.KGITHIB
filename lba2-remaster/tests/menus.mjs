// Menus, pause, settings and input states, through the real page: clicks on the buttons and keyboard events
// (page.keyboard → the game's keydown/keyup listeners). Fresh browser profile (no saved settings, no save).
import { launch, open, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const step = (s) => ev((s) => game.step(s), s);
const vis = (sel) => ev((sel) => { const e = document.querySelector(sel); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none'; }, sel);
const shown = () => ev(() => [...document.querySelectorAll('.screen')].filter((e) => !e.classList.contains('hidden') && e.id !== 'loading').map((e) => e.id));

await open(page, '?nocine');
// ---- first launch: title, no save
check('first launch: the title menu is up, nothing else', JSON.stringify(await shown()) === '["title"]', await shown());
const cont = await ev(() => { const b = document.querySelector('#btn-continue'); return { disabled: b.disabled, hidden: b.classList.contains('hidden') || getComputedStyle(b).display === 'none' }; });
check('first launch: Continue is unavailable without a save', cont.disabled || cont.hidden, cont);
check('first launch: settings are the defaults (Classic controls, LBA camera)', await ev(() => game.settings.controls === 'classic' && game.settings.camera === 'lba'), await ev(() => game.settings));

// ---- settings and controls screens: open and close repeatedly
for (let i = 0; i < 5; i++) {
  await page.click('#title [data-act="settings"]'); await step(0.05);
  if (!(await vis('#settings'))) break;
  await page.click('#settings [data-act="back"]'); await step(0.05);
}
check('settings open/close ×5 from the title, back to the title', JSON.stringify(await shown()) === '["title"]', await shown());
for (let i = 0; i < 3; i++) { await page.click('#title [data-act="controls"]'); await step(0.05); await page.click('#controls [data-act="back"]'); await step(0.05); }
check('controls open/close ×3, back to the title', JSON.stringify(await shown()) === '["title"]', await shown());

// ---- keyboard navigation on the title (arrows move the selection, Enter presses)
await page.keyboard.press('ArrowDown'); await step(0.05); await page.keyboard.press('ArrowDown'); await step(0.05);
const sel = await ev(() => [...document.querySelectorAll('#title .menu button')].findIndex((b) => b.classList.contains('sel')));
check('title: the arrow keys move the selection', sel >= 1, sel);

// ---- a setting changed in the menu is applied and kept after a reload
await page.click('#title [data-act="settings"]'); await step(0.05);
await page.click('#settings .seg[data-setting="quality"] button[data-v="medium"]');
await page.click('#settings .seg[data-setting="textSpeed"] button[data-v="fast"]');
const q1 = await ev(() => [game.settings.quality, game.settings.textSpeed, game.hud.textRate]);
await page.click('#settings [data-act="back"]');
await page.reload(); await open(page, '?nocine');
await page.click('#title [data-act="settings"]'); await step(0.05);
const q2 = await ev(() => [game.settings.quality, game.settings.textSpeed, document.querySelector('#settings .seg[data-setting="quality"] button.on')?.dataset.v]);
await page.click('#settings [data-act="back"]'); await step(0.05);
check('settings: quality and text speed apply at once', q1[0] === 'medium' && q1[1] === 'fast' && q1[2] === 95, q1);
check('settings: kept after relaunch, and the menu shows them', q2[0] === 'medium' && q2[1] === 'fast' && q2[2] === 'medium', q2);

// ---- new game
await page.click('#title [data-act="new"]');
await ev(() => { game.testFreeze = true; P.settle(); });
check('New Game: in play, in the house, the title gone', await ev(() => game.state === 'play' && game.room?.id === 'house') && (await shown()).length === 0, await ev(() => P.state()));

// ---- pause: Esc opens it, the world stops, held keys don't leak, Esc resumes
await page.keyboard.press('Escape'); await step(0.1);
const p0 = await ev(() => [game.hero.pos.x, game.hero.pos.z, game.time]);
check('Esc pauses: the pause menu is up', await ev(() => game.state === 'pause') && await vis('#pause'), await ev(() => game.state));
await page.keyboard.down('ArrowUp'); await step(1.0); await page.keyboard.up('ArrowUp');
const p1 = await ev(() => [game.hero.pos.x, game.hero.pos.z]);
check('paused: holding Up does not move the hero', Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 1e-6, { p0, p1 });
await page.keyboard.press('Escape'); await step(0.1);
check('Esc again resumes, the menu is gone', await ev(() => game.state === 'play') && !(await vis('#pause')), await ev(() => game.state));
// rapid pause/resume
for (let i = 0; i < 20; i++) { await page.keyboard.press('Escape'); await step(0.05); }
check('20 Esc presses 50 ms apart: back in play, no screen left over', await ev(() => game.state === 'play') && (await shown()).length === 0, { st: await ev(() => game.state), sc: await shown() });
// pause → settings → back → resume (button)
await page.keyboard.press('Escape'); await step(0.1);
await page.click('#pause [data-act="settings"]'); await step(0.05);
await page.click('#settings [data-act="back"]'); await step(0.05);
check('pause → settings → back returns to the pause menu', JSON.stringify(await shown()) === '["pause"]', await shown());
await page.click('#pause [data-act="resume"]'); await step(0.1);
check('Resume button: back in play', await ev(() => game.state === 'play') && (await shown()).length === 0, await shown());

// ---- a held key is released when the window loses focus
await page.keyboard.down('ArrowUp'); await step(0.3);
await ev(() => window.dispatchEvent(new Event('blur')));
const b0 = await ev(() => [game.hero.pos.x, game.hero.pos.z]); await step(0.6);
const b1 = await ev(() => [game.hero.pos.x, game.hero.pos.z, game.input.keys.size]);
await page.keyboard.up('ArrowUp');
check('focus lost while holding Up: the hero stops, no key stays held', Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) < 0.15 && b1[2] === 0, { b0, b1 });

// ---- dialogue: movement keys don't move him while someone is talking
await ev(() => { P.settle(); });
const talk = await ev(() => {
  const s = game.room.searches[0];
  P.go(s.x, s.z, { tol: 1.0 }); P.face(s.x, s.z); return P.target();
});
await page.keyboard.press('KeyE'); await step(0.1);
const d0 = await ev(() => [game.state, game.hero.pos.x, game.hero.pos.z]);
await page.keyboard.down('ArrowUp'); await step(1.0);
const d1 = await ev(() => [game.state, game.hero.pos.x, game.hero.pos.z]);
check('dialogue: holding Up does not move the hero', d0[0] === 'dialog' && Math.hypot(d1[1] - d0[1], d1[2] - d0[2]) < 1e-6, { talk, d0, d1 });
await page.keyboard.up('ArrowUp');
for (let i = 0; i < 20 && (await ev(() => game.state)) === 'dialog'; i++) { await page.keyboard.press('KeyE'); await step(0.15); }
check('dialogue: E advances to the end, back in play with the ball', await ev(() => game.state === 'play' && game.hero.hasBall), await ev(() => [game.state, game.hero.hasBall]));

// ---- inventory and journal (I), behaviour menu (Ctrl)
await page.keyboard.press('KeyI'); await step(0.1);
const inv = await ev(() => [game.state, !document.querySelector('#inventory').classList.contains('hidden')]);
await page.keyboard.press('KeyI'); await step(0.1);
const inv2 = await ev(() => [game.state, !document.querySelector('#inventory').classList.contains('hidden')]);
check('I opens the inventory and closes it again', inv[0] === 'inventory' && inv[1] && inv2[0] === 'play' && !inv2[1], { inv, inv2 });
await page.keyboard.down('ControlLeft'); await step(0.1);
await page.keyboard.press('ArrowRight'); await step(0.1);
const beh = await ev(() => game.hero.behaviour);
await page.keyboard.up('ControlLeft'); await step(0.1);
check('Ctrl + Right switches the behaviour (Normal → Athletic)', beh === 'athletic', beh);
await page.keyboard.press('F1'); await step(0.1);
check('F1 picks Normal again', await ev(() => game.hero.behaviour === 'normal'));

// ---- holomap (H in Classic) needs the ball; opens and closes
await page.keyboard.press('KeyH'); await step(0.1);
const hm = await ev(() => [game.state, !document.querySelector('#holomap').classList.contains('hidden')]);
await page.keyboard.press('KeyH'); await step(0.1);
check('H opens the holomap and closes it', hm[0] === 'map' && hm[1] && await ev(() => game.state === 'play' && document.querySelector('#holomap').classList.contains('hidden')), hm);

// ---- rebinding: interact → G; the prompt shows it; reset restores
await page.keyboard.press('Escape'); await step(0.1);
await page.click('#pause [data-act="controls"]'); await step(0.05);
const idx = await ev(() => { const labs = [...document.querySelectorAll('#rebind label')].map((l) => l.textContent); return labs.findIndex((t) => /talk|interact|search/i.test(t)); });
await page.click(`#rebind button.keybtn >> nth=${idx}`);
await page.keyboard.press('KeyG');
const rb = await ev(() => [game.settings.keys, game.keyName('interact')]);
check('rebinding: interact → G is stored and named', rb[1] === 'G', rb);
await page.click('#controls [data-act="resetkeys"]');
check('reset keys: back to the defaults', await ev(() => game.keyName('interact') !== 'G' && Object.keys(game.settings.keys || {}).length === 0), await ev(() => [game.settings.keys, game.keyName('interact')]));
await page.click('#controls [data-act="back"]'); await page.click('#pause [data-act="resume"]'); await step(0.1);
check('after the menus: in play, no overlay', await ev(() => game.state === 'play') && (await shown()).length === 0, await shown());

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
