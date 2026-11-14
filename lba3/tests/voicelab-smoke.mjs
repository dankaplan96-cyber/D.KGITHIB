// VOICE-2: the ?voicelab audition view opens, lists its choices, and plays a line in each style (mechanical only)
import { launch, open, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await open(page, '?voicelab&nocine');
await page.waitForSelector('#voicelab', { timeout: 120000 });
const info = await page.evaluate(() => ({ who: document.querySelectorAll('#vl-who option').length, int: [...document.querySelectorAll('#vl-int option')].map((o) => o.value), styles: [...document.querySelectorAll('#vl-style option')].map((o) => o.value) }));
check('the audition view opens with characters, intentions and the four styles', info.who >= 10 && info.int.length === 8 && info.styles.join() === 'expressive,words2,words,classic', info);
const played = [];
for (const s of info.styles) {
  await page.selectOption('#vl-style', s); await page.selectOption('#vl-int', 'urgent'); await page.selectOption('#vl-who', 'zoe');
  await page.click('#vl-play');
  await page.waitForTimeout(2500);
  played.push(await page.evaluate(() => document.querySelector('#vl-info').textContent));
  await page.click('#vl-stop');
}
check('each style plays a line (lines counted, Expressive from Zoé\'s Expressive bank), and no page error', /lines 4/.test(played[3]) && /x:zoe:/.test(played[0]) && errs.length === 0, { played, errs });
await browser.close();
done();
