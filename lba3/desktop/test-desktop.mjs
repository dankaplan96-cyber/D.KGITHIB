// Desktop app smoke test (Linux, under xvfb): the window opens, the game loads from app://, a new game plays the
// opening (skipped), control and the save; the app restarts and Continue resumes from the save on disk.
//   xvfb-run -a node test-desktop.mjs [path to built app executable]
import { _electron as electron } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const exe = process.argv[2];
let fails = 0;
const check = (n, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${info ? ' ' + JSON.stringify(info) : ''}`); if (!ok) fails++; };
const launch = () => electron.launch(exe
  ? { executablePath: exe, args: ['--no-sandbox'], env: { ...process.env, LBA3_SOFTWARE_GL: '1' } }
  : { executablePath: join(HERE, 'node_modules/electron/dist/electron'), args: ['--no-sandbox', HERE], env: { ...process.env, LBA3_SOFTWARE_GL: '1' } });

let app = await launch();
let win = await app.firstWindow();
const errs = []; win.on('pageerror', (e) => errs.push(e.message)); win.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await win.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 400000 });
const info = await win.evaluate(() => ({ url: location.href, title: document.title, desktop: !!window.desktop, cont: document.querySelector('#btn-continue').disabled }));
check('the game loads in its own window from app://', info.url.startsWith('app://game/') && info.desktop, info);
const extra = await win.evaluate(async () => { await document.fonts.ready; return { quit: getComputedStyle(document.querySelector('[data-act="exitapp"]')).display !== 'none', font: document.fonts.check('16px Rubik'), google: !!document.querySelector('link[href*="googleapis"]') }; });
check('the title has Quit Game; the font is bundled (no Google Fonts)', extra.quit && extra.font && !extra.google, extra);
const userData = await app.evaluate(({ app }) => app.getPath('userData'));
console.log('saves live in', userData);
await win.evaluate(() => localStorage.clear());
await win.evaluate(() => { game.testFreeze = true; });
await win.click('[data-act="new"]');
await win.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
await win.evaluate(() => { for (let i = 0; i < 90; i++) game.frame(1 / 30, false); });
await win.keyboard.down('KeyE');
await win.evaluate(() => { for (let i = 0; i < 36; i++) game.frame(1 / 30, false); });
await win.keyboard.up('KeyE');
await win.waitForTimeout(800);
await win.evaluate(() => { for (let i = 0; i < 6; i++) game.frame(1 / 30, false); });
const st = await win.evaluate(() => ({ state: game.state, room: game.room?.id, saved: !!localStorage.getItem('lba3_save_v1'), obj: document.querySelector('#objective').textContent }));
check('new game: the opening plays and hands over, saved', st.state === 'play' && st.room === 'house' && st.saved && st.obj === 'Check the well', st);
await app.close();

// the save survives a restart (it is on disk, not in a browser profile)
app = await launch();
win = await app.firstWindow();
await win.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 400000 });
await win.evaluate(() => { game.testFreeze = true; });
const again = await win.evaluate(() => ({ cont: !document.querySelector('#btn-continue').disabled }));
check('after a restart Continue is available', again.cont, again);
await win.click('[data-act="continue"]');
await win.evaluate(() => { for (let i = 0; i < 45; i++) game.frame(1 / 30, false); game.renderer.render(); });
const resumed = await win.evaluate(() => ({ state: game.state, room: game.room?.id, cine: !!game.cine }));
check('Continue resumes in the house, no replay of the opening', resumed.state === 'play' && resumed.room === 'house' && !resumed.cine, resumed);
await win.screenshot({ path: join(HERE, 'release-check.png') });
// Quit Game on the title screen closes the app
await win.evaluate(() => game.reloadInto ? null : null);
const closed = new Promise((res) => app.process().once('exit', () => res(true)));
await win.evaluate(() => window.desktop.quit());
check('Quit Game closes the app', await Promise.race([closed, new Promise((res) => setTimeout(() => res(false), 8000))]));
console.log(errs.length ? errs.slice(0, 8).join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
