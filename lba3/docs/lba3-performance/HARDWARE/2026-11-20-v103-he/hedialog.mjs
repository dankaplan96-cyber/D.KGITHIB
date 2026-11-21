// 52.2: every line of the opening, chapter 1 and chapter 2 in Hebrew at Subtitle Size Extra large, 1920x1080: shown whole
// in the dialogue box? (cut, overflowing, off screen); pictures of the longest lines
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [URL0, OUT, STORE, FILES] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--window-size=1940,1220'] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, storageState: STORE })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(async (FILES) => {
  const G = game, I = await import(new URL('src/game/i18n.js', location.href).href), keys = [];
  for (const f of FILES.split(',')) { const src = await (await fetch(new URL('src/game/text/' + f + '.js', location.href))).text(); for (const m of src.matchAll(/^\s+([a-z][a-z0-9_]*):\s*['"\[`]/gm)) keys.push(m[1]); }
  const D = document.querySelector('#dialog'), T = D.querySelector('.text'), bad = [], all = []; let n = 0, enOnly = 0;
  G.testFreeze = true;
  for (const k of [...new Set(keys)]) {
    const v = I.STR.he?.[k]; if (v == null) { if (I.STR.en[k] != null && !/^n_|_obj|^mp_|^set_|^p_/.test(k)) enOnly++; continue; }
    if (/^n_|_obj|^mp_|^set_|^p_/.test(k)) continue;
    for (const line of [].concat(v)) { if (typeof line !== 'string' || line.length < 2) continue; n++;
      G.say('n_zoe', [line]); for (let i = 0; i < 4 && T.textContent.length < line.length; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
      const b = D.getBoundingClientRect(), over = T.scrollHeight > T.clientHeight + 2 || T.scrollWidth > T.clientWidth + 2, off = b.bottom > innerHeight + 1 || b.right > innerWidth + 1 || b.left < -1 || b.top < -1, cut = T.textContent.length < line.length;
      all.push({ k, len: line.length, h: Math.round(b.height) });
      if (over || off || cut) bad.push({ k, len: line.length, over, off, cut, shown: T.textContent.length, h: Math.round(b.height) });
      for (let i = 0; i < 6 && G.state === 'dialog'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } }
  }
  all.sort((a, b) => b.len - a.len);
  return { lines: n, enOnly, bad: bad.slice(0, 25), badN: bad.length, longest: all.slice(0, 3), font: getComputedStyle(T).fontSize, dir: getComputedStyle(T).direction, align: getComputedStyle(T).textAlign };
}, FILES);
// pictures: the longest line, and a short one, as the player sees them
for (const [i, k] of r.longest.slice(0, 2).map((x, i) => [i, x.k])) {
  await page.evaluate((k) => import(new URL('src/game/i18n.js', location.href).href).then((I) => { const G = game; const v = [].concat(I.STR.he[k]); v.sort((a, b) => b.length - a.length); G.say('n_zoe', [v[0]]); for (let j = 0; j < 4; j++) { G.input.taps.add('KeyE'); G.step(0.05); } }), k);
  await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/dialog-longest-${i + 1}.jpg`, type: 'jpeg', quality: 82 });
  await page.evaluate(() => { const G = game; for (let j = 0; j < 6 && G.state === 'dialog'; j++) { G.input.taps.add('KeyE'); G.step(0.05); } });
}
r.errs = errs.slice(0, 5);
fs.writeFileSync(`${OUT}/dialog.json`, JSON.stringify(r, null, 1)); console.log(JSON.stringify(r).slice(0, 1500));
await browser.close(); process.exit(0);
