// FRAME-1: the settings screen with the frame-rate limit row, at 640×360 (the smallest supported window) and
// 1366×768 (the user's laptop): does it fit and read; is the last row reachable (scroll) at 640×360.
//   GAME_URL=http://localhost:8171/ node settingsshot.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const out = new URL('.', import.meta.url).pathname;
for (const [w, h] of [[640, 360], [1366, 768]]) {
  const { browser, page } = await launch({ width: w, height: h });
  await open(page, '?nocine');
  await page.click('#title [data-act="settings"]');
  await page.evaluate(() => { game.step(0.1); document.querySelector('#settings .seg[data-setting="fps"]').scrollIntoView({ block: 'center' }); });
  const r = await page.evaluate(() => { const e = document.querySelector('#settings .seg[data-setting="fps"]').getBoundingClientRect(); return { top: Math.round(e.top), bottom: Math.round(e.bottom), left: Math.round(e.left), right: Math.round(e.right), vw: innerWidth, vh: innerHeight }; });
  console.log(`${w}x${h} frame-rate row`, JSON.stringify(r), r.bottom <= r.vh && r.right <= r.vw && r.top >= 0 ? 'on screen' : 'OFF SCREEN');
  await page.screenshot({ path: `${out}settings-${w}x${h}.jpg`, type: 'jpeg', quality: 70 });
  await browser.close();
}
