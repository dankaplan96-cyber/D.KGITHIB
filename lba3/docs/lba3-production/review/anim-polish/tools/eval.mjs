// ANIM-POLISH: boot chapter 1 and run a JS file (argv[2]) in the page; prints its JSON result. GAME_URL as cap.mjs.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const code = fs.readFileSync(process.argv[2], 'utf8');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('pageerror: ' + e.message));
await page.goto((process.env.GAME_URL || 'http://localhost:8711/') + '?nocine', { waitUntil: 'load', timeout: 600000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 900000 });
await page.evaluate(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 600000 });
await page.evaluate(() => {
  const G = window.game; G.testFreeze = true;
  const talkAll = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
  talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); talkAll();
});
console.log(JSON.stringify(await page.evaluate(code), null, 1));
await browser.close();
