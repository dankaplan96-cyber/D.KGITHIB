// Shared boot for the regression tests: a fresh browser profile (no saved settings or saves unless given), the
// game served at localhost:8123, the player-input harness (tests/lib/player.js) installed as window.P.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./player.js', import.meta.url));
export const URL0 = process.env.GAME_URL || 'http://localhost:8123/';

export async function launch({ width = 960, height = 540, storageState } = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width, height }, ...(storageState ? { storageState } : {}) });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  if (process.env.LIVE_ERRS) { page.on('pageerror', (e) => console.log('LIVE pageerror', e.message)); page.on('console', (m) => { if (m.type() === 'error') console.log('LIVE console', m.text()); }); }
  return { browser, context, page, errs };
}

// load the page and wait for the title screen; `query` e.g. '?nocine' skips the opening cinematic
export async function open(page, query = '', { freeze = true } = {}) {
  // a navigation the game started itself (Quit's delayed reload) can abort ours under heavy load: let it land, retry
  for (let i = 0; ; i++) {
    try { await page.goto(URL0 + query, { waitUntil: 'load', timeout: 180000 }); break; }
    catch (e) { if (i >= 2 || !/ERR_ABORTED|frame was detached/.test(e.message)) throw e; await page.waitForLoadState('load').catch(() => {}); await page.waitForTimeout(1500); }
  }
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
  if (freeze) await page.evaluate(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
}

// press a title-menu button the way a player does (a real click on the button)
export async function menu(page, act) {
  await page.click(`[data-act="${act}"]`, { timeout: 60000 });
  await page.evaluate(() => { game.testFreeze = true; game.step(0.2); });
}

export function checker() {
  let fails = 0; const rows = [];
  const check = (name, ok, info) => { if (!ok) fails++; rows.push([name, !!ok]); console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : JSON.stringify(info)?.slice(0, 600)); };
  const done = (errs) => { console.log(errs.length ? errs.slice(0, 15).join('\n') : 'no errors'); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); return fails; };
  return { check, done, rows };
}

// Esc → pause menu → "Quit to title" (it saves), then keep the browser storage (the save) in a file
export async function quitAndKeep(page, context, file) {
  await page.evaluate(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  // the game saves, then reloads the page 500 ms later (src/main.js): wait for that reload, or a later open() races it
  const reloaded = page.waitForEvent('load', { timeout: 300000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000 });
  await reloaded;
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 })
    .catch(async (e) => {   // say where the boot stopped, not just that it timed out
      const st = await page.evaluate(() => ({ url: location.href, game: !!window.game, preparing: window.game?.preparing, loading: document.querySelector('#loading')?.textContent?.slice(0, 120) })).catch((x) => String(x));
      console.log('quitAndKeep: the reload did not finish booting', JSON.stringify(st)); throw e; });
  await context.storageState({ path: file });
}
