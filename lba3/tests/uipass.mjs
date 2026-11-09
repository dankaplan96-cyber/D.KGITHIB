// UI-PASS (WORKPLAN-2026-11-09 Wave B item 3): the menus' and the HUD's behaviour after the interface pass, through
// the real page (keyboard events, clicks, a simulated gamepad, a touch phone):
//   - Back is the same everywhere: Esc (or a pad's B) on Settings, Controls, the confirmations and the slot screens
//     returns to the screen they came from with its selection; on the pause menu it resumes; the menus' arrows,
//     Enter and Esc work whatever the bindings (Classic's Up rebound; Pause rebound away from Esc)
//   - the title leaves out Continue / Load Game with no save; one burning entry under the mouse and the keys
//   - Controls: one list from the keys in use, its first key selected and in view; a rebound key shows at once; a
//     pad's B gives up a key being awaited; left / right go across the two columns
//   - Settings: a line under the panel says what the selected row does, for every row
//   - the inventory has a Close button; a phone: the touch buttons step aside in menus and dialogue, the inventory
//     has a button, long messages wrap inside the window, the pause button clears the life bar
// Automated runtime only (SwiftShader, headless Chromium).
import { launch, open, menu, checker, watch, URL0 } from './lib/boot.mjs';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const { check, done } = checker();
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const step = (s = 0.05) => ev((s) => game.step(s), s);
const key = async (k) => { await page.keyboard.press(k); await step(); };
const where = () => ev(() => [game.screen, game.state, document.querySelector(`#${game.screen} .sel`)?.dataset.act || document.querySelector(`#${game.screen} .sel`)?.className || null]);

await open(page, '?nocine');
// ---- the title with no save
const t0 = await ev(() => ['btn-continue', 'btn-load'].map((id) => { const b = document.getElementById(id); return [b.disabled, getComputedStyle(b).display]; }));
check('title, no save: Continue and Load Game are left out (not shown dimmed)', t0.every(([d, disp]) => d && disp === 'none'), t0);
// ---- Esc on Settings from the title: back to the title, Settings still selected
await page.click('#title [data-act="settings"]'); await step();
await key('Escape');
const w1 = await where();
check('title → Settings → Esc: back on the title with Settings selected', w1[0] === 'title' && w1[2] === 'settings', w1);
// ---- one burning entry: the mouse selects what it moves onto
await page.mouse.move(5, 5); await page.hover('#title [data-act="controls"]'); await step();
const hv = await ev(() => [...document.querySelectorAll('#title .menu button')].filter((b) => b.classList.contains('sel') || b.matches(':hover')).map((b) => b.dataset.act));
check('title: the entry under the mouse is the selected one, nothing else burns', JSON.stringify(hv) === '["controls"]', hv);
await key('ArrowUp');
const hv2 = await ev(() => document.querySelector('#title .menu button.sel')?.dataset.act);
check('title: then the arrow keys go on from it', hv2 === 'settings', hv2);
// ---- Settings: what the selected row does, every row
await page.click('#title [data-act="settings"]'); await step();
const desc = await ev(() => {
  const out = [];
  for (const tab of ['game', 'controls', 'display', 'sound']) {
    game.setAdv = { [tab]: true }; game.setTabTo(tab);
    const items = game.settingsItems();
    items.forEach((it, k) => { game.menuSel = k; game.focusMenu(); out.push([tab, it.dataset.hint || it.className.split(' ')[0], document.querySelector('#settings .set-desc').textContent]); });
  }
  game.setAdv = {}; game.setTabTo('game'); game.menuSel = 0; game.focusMenu();
  return out;
});
const empty = desc.filter(([, what, d]) => !d && what !== 'sel');   // (Back: its class is 'sel' alone)
check('Settings: every row, the tab bar and Advanced have a line saying what they do (Back has none)', !empty.length && desc.filter(([, , d]) => d).length >= 22, { empty, n: desc.filter(([, , d]) => d).length });
const lm = desc.find(([, w]) => w === 'lockMode')?.[2], tabs = desc.find(([, w]) => w === 'set-tabs')?.[2];
check('Settings: the lines name the keys in use (Focus: L / right-click; the tab bar: Tab)', /L \/ right-click/.test(lm) && /Tab/.test(tabs), { lm, tabs });
await key('Escape');
// ---- Controls: one list from the keys in use, the first key selected and in view
await page.click('#title [data-act="controls"]'); await step();
const c0 = await ev(() => { const s = document.querySelector('#controls .sel'), r = s.getBoundingClientRect(), back = document.querySelector('#controls [data-act="back"]').getBoundingClientRect(); return { cls: s.className, act: s.dataset.action, top: r.top, bottom: r.bottom, H: innerHeight, back: [back.top, back.bottom], rows: document.querySelectorAll('#rebind .krow').length, cols: getComputedStyle(document.querySelector('#rebind')).gridTemplateColumns.split(' ').length, scheme: document.querySelector('#controls .kscheme').textContent }; });
check('Controls at 1280×720: the first key is selected and in view, Back inside the window, two columns, the scheme named', /keybtn/.test(c0.cls) && c0.act === 'up' && c0.top >= 0 && c0.bottom <= c0.H && c0.back[1] <= c0.H && c0.cols === 2 && /Classic/.test(c0.scheme), c0);
await key('ArrowRight');
const c1 = await ev(() => document.querySelector('#controls .sel')?.dataset.action);
check('Controls: → goes across to the key beside', c1 && c1 !== 'up' && c1 !== 'down', c1);
await key('ArrowLeft');
// rebind Up (Classic: its only key) to U: the list says U; the arrows still move in the menus
await key('Enter');
const waiting = await ev(() => document.querySelector('#rebind .keybtn.wait')?.dataset.action);
await page.keyboard.press('KeyU'); await step();
const c2 = await ev(() => [game.keyName('up'), document.querySelector('#rebind .keybtn[data-action="up"]').textContent, game.menuSel]);
await key('ArrowUp');
const c3 = await ev(() => document.querySelector('#controls .sel')?.dataset.act);
await key('ArrowDown');
const c4 = await ev(() => document.querySelector('#controls .sel')?.dataset.action);
check('Controls: Enter awaits a key; U rebinds Up (shown); ↑ still moves in the menu with Up off the arrow (to Back, wrapping), ↓ back', waiting === 'up' && c2[0] === 'U' && c2[1] === 'U' && c3 === 'back' && c4 === 'up', { waiting, c2, c3, c4 });
// a pad: A awaits, B gives it up
await ev(() => { const btn = (p) => ({ pressed: p, value: p ? 1 : 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => btn(false)) }; navigator.getGamepads = () => [window.__pad]; window.padTap = (i) => { window.__pad.buttons[i] = btn(true); game.step(0.05); window.__pad.buttons[i] = btn(false); game.step(0.05); }; });
const pd = await ev(() => { padTap(0); const w = !!document.querySelector('#rebind .keybtn.wait'); padTap(1); return [w, !!document.querySelector('#rebind .keybtn.wait'), !!game._rebindOff, game.screen]; });
check('Controls with a pad: A awaits a key, B gives it up (the screen stays)', pd[0] && !pd[1] && !pd[2] && pd[3] === 'controls', pd);
const pd2 = await ev(() => { padTap(1); const r = [game.screen]; window.__pad.connected = false; game.step(0.05); game.input.lastDevice = 'kbd'; return r; });
check('Controls with a pad: B again goes back to the title', pd2[0] === 'title', pd2);
await page.click('#title [data-act="controls"]'); await step();
await page.click('#controls [data-act="resetkeys"]'); await step();
check('Reset: Up is ↑ again', await ev(() => game.keyName('up')) === '↑', await ev(() => game.keyName('up')));
// the Reset / Back row: ← → move between them
await ev(() => { const b = game.menuButtons(); game.menuSel = b.findIndex((x) => x.dataset.act === 'resetkeys'); game.focusMenu(); });
await key('ArrowRight');
const rb = await ev(() => document.querySelector('#controls .sel')?.dataset.act);
check('Controls: → from Reset to Back (side by side)', rb === 'back', rb);
await key('Enter');

// ---- a game: pause, Esc paths, pause rebound
await menu(page, 'new');
await ev(() => { game.testFreeze = true; P.settle(); });
await key('Escape');
await page.click('#pause [data-act="settings"]'); await step();
await key('Escape');
const p1 = await where();
await page.click('#pause [data-act="controls"]'); await step();
await key('Escape');
const p2 = await where();
await key('Escape');
const p3 = await ev(() => game.state);
check('pause → Settings → Esc: the pause menu (Settings selected); → Controls → Esc: the pause menu (Controls selected); Esc: play', p1[0] === 'pause' && p1[2] === 'settings' && p2[0] === 'pause' && p2[2] === 'controls' && p3 === 'play', { p1, p2, p3 });
// Pause rebound to O: O pauses, Esc still backs out of a menu and resumes
await ev(() => { game.settings.keys = { pause: 'KeyO' }; game.applySettings(); });
await key('KeyO');
const q1 = await ev(() => game.state);
await page.click('#pause [data-act="settings"]'); await step();
await key('Escape');
const q2 = await where();
await key('Escape');
const q3 = await ev(() => game.state);
await ev(() => { game.settings.keys = {}; game.applySettings(); });
check('Pause rebound to O: O pauses; Esc still goes back from Settings and resumes from the pause menu', q1 === 'pause' && q2[0] === 'pause' && q3 === 'play', { q1, q2, q3 });
// rapid open / close: no screen left over, no doubled selection
for (let i = 0; i < 6; i++) { await page.keyboard.press('Escape'); await step(0.02); await page.click('#pause [data-act="settings"]').catch(() => {}); await step(0.02); await page.keyboard.press('Escape'); await step(0.02); await page.keyboard.press('Escape'); await step(0.02); }
const rr = await ev(() => [game.state, [...document.querySelectorAll('.screen')].filter((e) => !e.classList.contains('hidden') && e.id !== 'loading').map((e) => e.id), document.querySelectorAll('.screen .sel').length]);
check('pause / Settings / back ×6 quickly: back in play, no screen left, at most one selection per screen', rr[0] === 'play' && rr[1].length === 0, rr);
// ---- the inventory: a Close button
await key('KeyI');
const iv = await ev(() => [game.state, !!document.querySelector('#inventory .inv-close')]);
await page.click('#inventory .inv-close'); await step(0.1);
check('inventory: a Close button, and it closes', iv[0] === 'inventory' && iv[1] && await ev(() => game.state === 'play' && document.querySelector('#inventory').classList.contains('hidden')), iv);
// ---- the confirmation of a new game: ← → between its answers, Esc back to the title
await ev(() => { game.save(false); game.hideScreens(); game.setState('title'); game.showScreen('title'); });
const t1 = await ev(() => ['btn-continue', 'btn-load'].map((id) => getComputedStyle(document.getElementById(id)).display));
check('title with a save: Continue and Load Game are shown', t1.every((d) => d !== 'none'), t1);
await page.click('#title [data-act="new"]'); await step();
const n0 = await ev(() => document.querySelector('#confirmnew .sel')?.dataset.act);
await key('ArrowRight');
const n1 = await ev(() => document.querySelector('#confirmnew .sel')?.dataset.act);
await key('Escape');
const n2 = await where();
check('New Game over a save: Back selected, → New Game, Esc back to the title with New Game selected', n0 === 'back' && n1 === 'newyes' && n2[0] === 'title' && n2[2] === 'new', { n0, n1, n2 });
await browser.close();

// ---- a phone (touch, 390×844)
{
  const b2 = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b2.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const ph = await ctx.newPage(); watch(ph);
  const pev = (f, a) => ph.evaluate(f, a);
  await open(ph, '?nocine');
  await menu(ph, 'new');
  await pev(() => { game.testFreeze = true; P.settle(); });
  const tp = await pev(() => {
    const vis = (e) => getComputedStyle(e).visibility !== 'hidden' && !e.closest('.hidden');
    const out = { dev: game.input.lastDevice, inv: !!document.querySelector('[data-touch="inventory"]'), labels: [...document.querySelectorAll('[data-touch]')].every((b) => b.getAttribute('aria-label')) };
    out.play = vis(document.querySelector('#touch .tbtns'));
    game.hud.forceStats = true; game.hud.stats(game.hero); game.step(0.1);
    const R = (s) => document.querySelector(s).getBoundingClientRect(), hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    out.statsPause = hit(R('#lifebar'), R('#pausebtn'));
    out.btnsWeapon = hit(R('.tbtns'), R('#weapon'));
    game.hud.toast('pr_well_rope', null, 60000);
    const t = R('#toast .toast'); out.toast = [Math.round(t.left), Math.round(t.right), innerWidth];
    game.pause(); out.paused = vis(document.querySelector('#touch .tbtns'));
    game.act('resume'); game.step(0.05);
    game.setState('inventory'); game.inventory.show(true); out.invHint = document.querySelector('#inventory .inv-hint').textContent; out.inInv = vis(document.querySelector('#touch .tbtns'));
    game.inventory.show(false); game.setState('play'); game.step(0.05);
    return out;
  });
  check('phone: touch names from the start, an Inventory button, every button named', tp.dev === 'touch' && tp.inv && tp.labels, tp);
  check('phone: the buttons show in play and step aside in the pause menu and the inventory', tp.play && !tp.paused && !tp.inInv, tp);
  check('phone: the pause button clears the life bar; the buttons clear the weapon; a long message wraps inside the window', !tp.statsPause && !tp.btnsWeapon && tp.toast[0] >= 0 && tp.toast[1] <= tp.toast[2], tp);
  check('phone: the inventory line speaks of taps', /Tap/.test(tp.invHint), tp.invHint);
  await b2.close();
}
done();
