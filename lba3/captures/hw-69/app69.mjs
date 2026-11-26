// ORDER 69 (INSTALL-69), on the built game itself (release\win-unpacked: the installer can't be built here, Smart App
// Control): first launch (fullscreen, the version, Ctrl+Shift+I, app-update.yml, F11 remembered, Alt+Tab), saves
// (Save & quit → Continue), Hebrew across a relaunch, a launch with no network. A profile of its own (--user-data-dir):
// the user's %APPDATA%\LBA3 The Awakening is not touched.
// usage: node app69.mjs <OUT> <win-unpacked dir> <profile dir> <step: first|saves|hebrew|offline>
import { _electron as electron } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, DIR, PROFILE, STEP] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(PROFILE, { recursive: true });
const EXE = path.join(DIR, 'LBA3 The Awakening.exe');
const res = {}; const log = (k, v) => { res[k] = v; console.log(k, JSON.stringify(v)); };
const launch = async (extra = []) => {
  const app = await electron.launch({ executablePath: EXE, args: [`--user-data-dir=${PROFILE}`, ...extra], timeout: 120000 });
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
  return { app, page };
};
const win = (app, f) => app.evaluate(({ BrowserWindow }, f) => { const w = BrowserWindow.getAllWindows()[0]; return eval(f)(w); }, f.toString());
const shot = (page, n) => page.screenshot({ path: `${OUT}/${STEP}-${n}.jpg`, type: 'jpeg', quality: 82 });
const key = async (page, k, ms = 80) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
if (STEP === 'first') {
  log('app-update.yml in resources', fs.existsSync(path.join(DIR, 'resources', 'app-update.yml')));
  let { app, page } = await launch();
  await page.waitForTimeout(1500);
  log('fullscreen at first launch', await win(app, (w) => w.isFullScreen()));
  log('title version text', await page.evaluate(() => [...document.querySelectorAll('body *')].map((e) => e.childElementCount === 0 ? e.textContent : '').find((t) => /v\d+\.\d+\.\d+/.test(t)) || null));
  await shot(page, '1-title');
  await key(page, 'Control+Shift+KeyI'.split('+').pop());   // (the plain I first, then the chord)
  await page.keyboard.press('Control+Shift+I'); await page.waitForTimeout(1200);
  log('devtools open after Ctrl+Shift+I', await win(app, (w) => w.webContents.isDevToolsOpened()));
  await page.keyboard.press('F11'); await page.waitForTimeout(1500);
  log('fullscreen after F11', await win(app, (w) => w.isFullScreen()));
  await shot(page, '2-windowed');
  // Alt+Tab, as the window loses and gets back the focus: the game and its sound after it
  const a0 = await page.evaluate(() => [game.state, game.audio?.ctx?.state || game.audio?.context?.state || null]);
  await win(app, (w) => { w.blur(); return true; }); await page.waitForTimeout(2500);
  const aMid = await page.evaluate(() => [game.state, game.audio?.ctx?.state || game.audio?.context?.state || null, document.hasFocus()]);
  await win(app, (w) => { w.focus(); return true; }); await page.waitForTimeout(2500);
  const a1 = await page.evaluate(() => [game.state, game.audio?.ctx?.state || game.audio?.context?.state || null, document.hasFocus()]);
  log('alt-tab: before / away / back (state, audio, focus)', [a0, aMid, a1]);
  await app.close();
  ({ app, page } = await launch()); await page.waitForTimeout(1500);
  log('fullscreen at relaunch after leaving it', await win(app, (w) => w.isFullScreen()));
  await page.keyboard.press('F11'); await page.waitForTimeout(1200);   // (back to fullscreen for the next steps)
  log('prefs file', fs.existsSync(path.join(PROFILE, 'window.json')) ? fs.readFileSync(path.join(PROFILE, 'window.json'), 'utf8') : fs.readdirSync(PROFILE).filter((f) => /json$/.test(f)));
  await app.close();
}
if (STEP === 'saves') {
  let { app, page } = await launch();
  await page.click('[data-act="new"]'); await page.waitForTimeout(900);
  if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
  // skip the opening as a player does (hold to skip)
  for (let i = 0; i < 40 && (await page.evaluate(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await page.waitForTimeout(900); await page.keyboard.up('KeyE'); }
  await page.waitForTimeout(1000);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1200); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(500);
  const before = await page.evaluate(() => ({ room: game.room?.id || 'out', x: +game.hero.pos.x.toFixed(2), z: +game.hero.pos.z.toFixed(2), state: game.state }));
  log('before saving', before); await shot(page, '1-before');
  await key(page, 'Escape'); await page.waitForTimeout(900); await shot(page, '2-pause');
  const btns = await page.evaluate(() => [...document.querySelectorAll('[data-act]')].filter((b) => b.offsetParent).map((b) => b.dataset.act + ':' + b.textContent.trim()));
  log('pause buttons', btns);
  const sq = btns.find((b) => /save.*quit|savequit|quit/i.test(b));
  if (sq) { await page.click(`[data-act="${sq.split(':')[0]}"]`); await page.waitForTimeout(1500); }
  await shot(page, '3-after-save-quit');
  const btns2 = await page.evaluate(() => [...document.querySelectorAll('[data-act]')].filter((b) => b.offsetParent).map((b) => b.dataset.act + ':' + b.textContent.trim()));
  log('buttons after save & quit', btns2);
  const quit = btns2.find((b) => /quit/i.test(b) && !/save/i.test(b));
  let closed = false;
  if (quit) { const p = app.waitForEvent('close', { timeout: 15000 }).then(() => (closed = true)).catch(() => {}); await page.click(`[data-act="${quit.split(':')[0]}"]`).catch(() => {}); await p; }
  log('Quit Game closed the app', closed);
  if (!closed) await app.close();
  ({ app, page } = await launch()); await page.waitForTimeout(1000); await shot(page, '4-relaunch-title');
  const cont = await page.evaluate(() => !!document.querySelector('[data-act="continue"]')?.offsetParent);
  log('Continue offered after relaunch', cont);
  if (cont) { await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 }); await page.waitForTimeout(2500);
    const after = await page.evaluate(() => ({ room: game.room?.id || 'out', x: +game.hero.pos.x.toFixed(2), z: +game.hero.pos.z.toFixed(2), state: game.state }));
    log('after Continue', after); await shot(page, '5-continued'); }
  await app.close();
}
if (STEP === 'hebrew') {
  let { app, page } = await launch();
  // Settings → Language: the settings object the menu writes, saved as the menu saves it
  await page.click('[data-act="settings"]').catch(() => {}); await page.waitForTimeout(800); await shot(page, '1-settings');
  const langCtl = await page.evaluate(() => { const el = [...document.querySelectorAll('select, button, [data-set]')].find((e) => /עברית|Hebrew|lang/i.test(e.outerHTML)); return el ? el.outerHTML.slice(0, 200) : null; });
  log('language control', langCtl);
  await page.evaluate(() => { game.settings.lang = 'he'; game.applySettings(); game.saveSettings?.(); });
  await page.waitForTimeout(800); await shot(page, '2-hebrew-set');
  await app.close();
  ({ app, page } = await launch()); await page.waitForTimeout(1200);
  log('language after relaunch', await page.evaluate(() => [game.settings.lang, document.documentElement.lang, document.documentElement.dir]));
  await shot(page, '3-relaunch-title');
  await page.click('[data-act="new"]'); await page.waitForTimeout(900);
  if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
  for (const s of [3, 6, 9]) { await page.waitForTimeout(3000); await shot(page, `4-opening-${s}s`); }
  for (let i = 0; i < 40 && (await page.evaluate(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await page.waitForTimeout(900); await page.keyboard.up('KeyE'); }
  // a talk: Zoé, from her far side, as in 68.1
  await page.evaluate(() => { const G = game; if (G.room) G.exitRoom({ x: -44.2, z: 76.5, a: Math.PI }, true); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const G = game, q = G.npcs.find((r) => r.def.id === 'zoe'), h = G.hero, x = q.pos.x + 1.3, z = q.pos.z + 0.2; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.atan2(q.pos.x - x, q.pos.z - z); G.camRig.snap?.(); });
  await page.waitForTimeout(1000); await key(page, 'KeyE'); await page.waitForTimeout(2500); await shot(page, '5-talk-hebrew');
  log('talk text', await page.evaluate(() => [document.querySelector('#dialog .name')?.textContent, document.querySelector('#dialog .text')?.textContent, getComputedStyle(document.querySelector('#dialog .text')).direction]));
  await page.evaluate(() => { game.settings.lang = 'en'; game.applySettings(); game.saveSettings?.(); });
  await app.close();
}
if (STEP === 'offline') {
  // every request of the app's own goes nowhere (a dead proxy): as with the network off, for this app only
  const errs = [];
  let { app, page } = await launch(['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=<-loopback>']);
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  log('offline: title', await page.evaluate(() => game.screen || game.state)); await shot(page, '1-title');
  await page.click('[data-act="new"]'); await page.waitForTimeout(900);
  if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
  for (let i = 0; i < 40 && (await page.evaluate(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await page.waitForTimeout(900); await page.keyboard.up('KeyE'); }
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowUp');
  log('offline: in play', await page.evaluate(() => [game.state, game.room?.id || 'out', +game.hero.pos.z.toFixed(2)])); await shot(page, '2-play');
  log('offline: errors', errs.slice(0, 8));
  await app.close();
}
fs.writeFileSync(`${OUT}/${STEP}.json`, JSON.stringify(res, null, 1));
process.exit(0);
