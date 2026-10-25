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

// ---- the settings screen (SETTINGS-UI): four pages, every stored setting still there, a few rows per page
await page.click('#title [data-act="settings"]'); await step(0.05);
const layout = await ev(() => {
  const S = document.querySelector('#settings');
  const keys = [...S.querySelectorAll('[data-setting]')].map((e) => e.dataset.setting).concat([...S.querySelectorAll('[data-range]')].map((e) => e.dataset.range));
  const pages = {};
  for (const p of S.querySelectorAll('.set-page')) pages[p.dataset.page] = { shown: p.querySelectorAll(':scope > .set-row').length, advanced: p.querySelectorAll('.set-adv .set-row').length };
  return { keys: keys.sort(), pages, tabs: [...S.querySelectorAll('.set-tabs [data-tab]')].map((b) => b.textContent), open: game.setTab, sel: S.querySelector('.sel')?.className };
});
const KEYS = ['aa', 'aimAssist', 'camera', 'controls', 'difficulty', 'fps', 'hud', 'lockMode', 'minimap', 'music', 'quality', 'res', 'sfx', 'shake', 'textSize', 'textSpeed', 'visual', 'voice'];
check('settings: every stored setting has its control (same keys as before)', JSON.stringify(layout.keys) === JSON.stringify(KEYS), layout.keys);
check('settings: four pages (Game, Controls, Display, Sound), at most 4 rows each before Advanced; opens on Game with the tabs selected', layout.tabs.join() === 'Game,Controls,Display,Sound' && Object.values(layout.pages).every((p) => p.shown <= 4) && layout.open === 'game' && /set-tabs/.test(layout.sel), layout);
// keyboard: → on the tabs turns the page, ↓ to Movement, → picks Modern (applied: Modern's keys), ← Classic again
await page.keyboard.press('ArrowRight'); await step(0.05);
await page.keyboard.press('ArrowDown'); await step(0.05);
const k0 = await ev(() => [game.setTab, document.querySelector('#settings .sel')?.querySelector('.seg')?.dataset.setting]);
await page.keyboard.press('ArrowRight'); await step(0.05);
const k1 = await ev(() => [game.settings.controls, game.keyName('up'), document.querySelector('#settings [data-hint="controls"] .set-hint').textContent]);
await page.keyboard.press('ArrowLeft'); await step(0.05);
const k2 = await ev(() => [game.settings.controls, game.keyName('up')]);
check('settings by keys: → turns to Controls, ↓ selects Movement, → Modern (WASD, its hint), ← Classic (arrows)', k0[0] === 'controls' && k0[1] === 'controls' && k1[0] === 'modern' && k1[1] === 'W' && /push/.test(k1[2]) && k2[0] === 'classic' && k2[1] === '↑', { k0, k1, k2 });
// Advanced by Enter on the fold; the free camera's hint names the keys in use
const foldAt = await ev(() => game.settingsItems().findIndex((e) => e.classList.contains('set-fold')));
for (let n = 1; n < foldAt; n++) { await page.keyboard.press('ArrowDown'); await step(0.05); }
await page.keyboard.press('Enter'); await step(0.05);
const adv = await ev(() => [game.setAdv?.controls, [...document.querySelectorAll('#settings .set-page.on .set-adv .set-row')].every((r) => r.offsetParent !== null), document.querySelector('#settings .sel')?.classList.contains('set-fold')]);
await page.keyboard.press('Enter'); await step(0.05);
const adv2 = await ev(() => [game.setAdv?.controls, document.querySelector('#settings .set-page.on .set-adv').offsetParent === null]);
check('settings: Enter on Advanced opens it (its rows shown, the fold still selected) and closes it', adv[0] === true && adv[1] && adv[2] && adv2[0] === false && adv2[1], { foldAt, adv, adv2 });
// a slider by keys (Sound page), held → repeats
await page.click('#settings [data-tab="sound"]'); await step(0.05);
await page.keyboard.press('ArrowDown'); await step(0.05);
const m0 = await ev(() => game.settings.music);
await page.keyboard.press('ArrowLeft'); await step(0.05);
const m1 = await ev(() => [game.settings.music, game.audio.vol.music, document.querySelector('#settings [data-range="music"] + output').textContent]);
await page.keyboard.press('ArrowRight'); await step(0.05);
check('settings: ← / → step the music volume by 5 % (applied, the level shown)', Math.abs(m1[0] - (m0 - 0.05)) < 1e-9 && m1[1] === m1[0] && m1[2] === `${Math.round(m1[0] * 100)}%` && Math.abs(await ev(() => game.settings.music) - m0) < 1e-9, { m0, m1 });
// the mouse: hovering a row selects it (one highlight), a click on a chip sets the value
await page.click('#settings [data-tab="game"]'); await step(0.05);
await page.hover('#settings .seg[data-setting="shake"] button[data-v="reduced"]'); await step(0.05);
const hv = await ev(() => [document.querySelectorAll('#settings .sel').length, document.querySelector('#settings .sel .seg')?.dataset.setting]);
check('settings: the row under the mouse is the selected one (one highlight)', hv[0] === 1 && hv[1] === 'shake', hv);

// ---- a setting changed in the menu is applied and kept after a reload
await page.click('#settings [data-tab="display"]');
await page.click('#settings .seg[data-setting="quality"] button[data-v="medium"]');
await page.click('#settings [data-tab="game"]');
await page.click('#settings .seg[data-setting="textSpeed"] button[data-v="fast"]');
await page.click('#settings [data-tab="display"]'); await page.click('#settings .set-page.on .set-fold');
await page.click('#settings .seg[data-setting="fps"] button[data-v="30"]');   // (FRAME-1: the frame-rate limit)
const q1 = await ev(() => [game.settings.quality, game.settings.textSpeed, game.hud.textRate, game.settings.fps, Math.round(game.frameCapMs * 10) / 10, Math.round(game.renderer.budgetMs * 10) / 10]);
await page.click('#settings [data-act="back"]');
await page.reload(); await open(page, '?nocine');
await page.click('#title [data-act="settings"]'); await step(0.05);
const q2 = await ev(() => [game.settings.quality, game.settings.textSpeed, document.querySelector('#settings .seg[data-setting="quality"] button.on')?.dataset.v, game.settings.fps, document.querySelector('#settings .seg[data-setting="fps"] button.on')?.dataset.v, Math.round(game.frameCapMs * 10) / 10]);
await page.click('#settings [data-tab="display"]'); await page.click('#settings .set-page.on .set-fold');
await page.click('#settings .seg[data-setting="fps"] button[data-v="auto"]');   // (back to no limit for the rest)
const q3 = await ev(() => [game.settings.fps, game.frameCapMs, Math.round(game.renderer.budgetMs * 10) / 10]);
await page.click('#settings [data-act="back"]'); await step(0.05);
check('settings: quality and text speed apply at once', q1[0] === 'medium' && q1[1] === 'fast' && q1[2] === 95, q1);
check('settings: kept after relaunch, and the menu shows them', q2[0] === 'medium' && q2[1] === 'fast' && q2[2] === 'medium', q2);
check('settings: the frame-rate limit applies at once (30: 33.3 ms, the automatic resolution\'s budget too), is kept after relaunch, and Off clears it', q1[3] === '30' && q1[4] === 33.3 && q1[5] === 33.3 && q2[3] === '30' && q2[4] === '30' && q2[5] === 33.3 && q3[0] === 'auto' && q3[1] === 0 && q3[2] === 16.7, { q1, q2, q3 });

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
const back1 = await ev(() => document.querySelector('#pause .menu button.sel')?.dataset.act);
check('back in the pause menu, Settings is still the selected entry', back1 === 'settings', back1);
// settings → Keys → the controls screen → Back (Keys still selected) → Back (pause, Settings selected), by keys
await page.click('#pause [data-act="settings"]'); await step(0.05);
await page.click('#settings [data-tab="controls"]'); await step(0.05);
await page.click('#settings .set-link'); await step(0.05);
const ck1 = JSON.stringify(await shown());
await page.click('#controls [data-act="back"]'); await step(0.05);
const ck2 = await ev(() => [game.screen, game.setTab, document.querySelector('#settings .sel')?.classList.contains('set-link')]);
const backAt = await ev(() => game.settingsItems().length - 1);
for (let n = 0; n < 10 && (await ev(() => game.menuSel)) !== backAt; n++) { await page.keyboard.press('ArrowDown'); await step(0.05); }
await page.keyboard.press('Enter'); await step(0.05);
const ck3 = await ev(() => [game.screen, game.state, document.querySelector('#pause .menu button.sel')?.dataset.act]);
check('settings → Keys opens the controls screen; its Back returns to Settings with Keys selected; Back by Enter returns to the pause menu', ck1 === '["controls"]' && ck2[0] === 'settings' && ck2[1] === 'controls' && ck2[2] && ck3[0] === 'pause' && ck3[1] === 'pause' && ck3[2] === 'settings', { ck1, ck2, ck3 });
// a pad: B backs out of the settings (Esc is unchanged: it resumes play from the pause's settings)
await page.click('#pause [data-act="settings"]'); await step(0.05);
await ev(() => { const btn = (p) => ({ pressed: p, value: p ? 1 : 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => btn(false)) }; navigator.getGamepads = () => [window.__pad]; game.step(0.05); window.__pad.buttons[1] = btn(true); game.step(0.05); window.__pad.buttons[1] = btn(false); game.step(0.05); window.__pad.connected = false; game.step(0.05); });
const pb = JSON.stringify(await shown());
await page.click('#pause [data-act="settings"]'); await step(0.05);
await page.keyboard.press('Escape'); await step(0.1);
const esc = await ev(() => [game.state, document.querySelector('#settings').classList.contains('hidden')]);
check('pad B in the settings returns to the pause menu; Esc in them resumes play (as before)', pb === '["pause"]' && esc[0] === 'play' && esc[1], { pb, esc });
await page.keyboard.press('Escape'); await step(0.1);
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
const inv = await ev(() => [game.state, !document.querySelector('#inventory').classList.contains('hidden'), document.querySelector('#inventory .inv-hint')?.textContent]);
check('the inventory\'s controls line names the keys in use (Classic: arrows, Shift / Esc)', inv[2] === '↑←↓→: select · Shift / Esc: close', inv[2]);
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
// the inventory's line follows a rebound key (inventory → U)
const invAt = await ev(() => [...document.querySelectorAll('#rebind label')].findIndex((l) => /inventory/i.test(l.textContent)));
await page.click(`#rebind button.keybtn >> nth=${invAt}`); await page.keyboard.press('KeyU');
await page.click('#controls [data-act="back"]'); await page.click('#pause [data-act="resume"]'); await step(0.1);
await page.keyboard.press('KeyU'); await step(0.1);
const invU = await ev(() => [game.state, document.querySelector('#inventory .inv-hint')?.textContent]);
await page.keyboard.press('KeyU'); await step(0.1);
check('rebound inventory key U: it opens the inventory and its line says U', invU[0] === 'inventory' && /U \/ Esc: close/.test(invU[1]), invU);
await page.keyboard.press('Escape'); await step(0.1);
await page.click('#pause [data-act="controls"]'); await step(0.05);
// one key awaited at a time; leaving the screen cancels it (a later key press rebinds nothing)
const before = await ev(() => JSON.stringify(game.settings.keys));
await page.click('#rebind button.keybtn >> nth=0'); await page.click('#rebind button.keybtn >> nth=1');
const waiting = await ev(() => document.querySelectorAll('#rebind .keybtn.wait').length);
await page.click('#controls [data-act="back"]'); await step(0.05);
await page.keyboard.press('KeyY'); await step(0.05);
const after = await ev(() => JSON.stringify(game.settings.keys));
check('rebinding: a second click replaces the first wait; leaving the screen cancels it (Y bound to nothing)', waiting === 1 && after === before && !after.includes('KeyY'), { before, after, waiting });
await page.click('#pause [data-act="controls"]'); await step(0.05);
await page.click('#controls [data-act="resetkeys"]');
check('reset keys: back to the defaults', await ev(() => game.keyName('interact') !== 'G' && Object.keys(game.settings.keys || {}).length === 0), await ev(() => [game.settings.keys, game.keyName('interact')]));
await page.click('#controls [data-act="back"]'); await page.click('#pause [data-act="resume"]'); await step(0.1);
check('after the menus: in play, no overlay', await ev(() => game.state === 'play') && (await shown()).length === 0, await shown());

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
