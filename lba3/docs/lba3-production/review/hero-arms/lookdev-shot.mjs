// HERO-ARMS: screenshots of arms-lookdev.html (one browser for all).
//   node lookdev-shot.mjs <game url> <out.png> '<query>' [<out.png> '<query>' ...]
//   e.g. node lookdev-shot.mjs http://localhost:8650/ /dev/shm/a.png 'c=twinsen&rows=idle,walk,foundL&cols=front,34,side,back,game'
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [URL0, ...args] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (let i = 0; i < args.length; i += 2) {
  const out = args[i], query = args[i + 1] || '';
  const qs = new URLSearchParams(query);
  const P = +(qs.get('panel') || 260);
  const rows = (qs.get('rows') || 'idle,walk,run,talk,listen').split(',').length;
  const cols = (qs.get('cols') || 'front,34,side,back,game').split(',').length;
  const page = await browser.newPage({ viewport: { width: P * cols, height: P * rows } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL0 + 'docs/lba3-production/review/hero-arms/arms-lookdev.html?' + query, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.hairDone, null, { timeout: 300000 }).catch(() => {});
  await page.screenshot({ path: out, timeout: 180000 });
  console.log(out, errs.slice(0, 5).join(' | ') || 'no errors');
  await page.close();
}
await browser.close();
