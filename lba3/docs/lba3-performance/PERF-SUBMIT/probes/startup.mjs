// STABILIZATION: the start trace here (SwiftShader: what runs on the main thread in each phase and every long frame's
// attribution; intervals are this machine's): the page from its first byte, TITLE_S on the title, New Game, PLAY_S after.
//   GAME_URL=http://localhost:8351/ [QS=?nocine] TITLE_S=10 PLAY_S=10 node startup.mjs
import { launch } from '../../../../tests/lib/boot.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8351/', T = +(process.env.TITLE_S || 10), P = +(process.env.PLAY_S || 10);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.goto(URL0 + (process.env.QS || ''), { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.screen === 'title', null, { timeout: 900000 });
await page.waitForTimeout(T * 1000);
await page.click('[data-act="new"]', { timeout: 120000 });
await page.waitForTimeout(P * 1000);
console.log(await page.evaluate(() => game.startupReport()));
await browser.close();
