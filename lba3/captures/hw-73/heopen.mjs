import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.goto(server.url, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.evaluate(() => { game.settings.lang = 'he'; game.applySettings(); });
await page.waitForTimeout(800);
await page.click('[data-act="new"]'); await page.waitForTimeout(900); if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
const seen = new Set(); const t0 = Date.now();
while ((Date.now() - t0) < 70000) {
  const s = await page.evaluate(() => { const el = [...document.querySelectorAll('#cine-sub')].find((e) => e.offsetParent && e.innerText.trim());
    if (!el) return null; const r = el.getBoundingClientRect(); const nm = el.querySelector('b, .name, .who, strong, span'); const nr = nm?.getBoundingClientRect();
    return { text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 90), dir: getComputedStyle(el).direction, box: [Math.round(r.left), Math.round(r.right)], name: nm ? [nm.innerText, Math.round(nr.left), Math.round(nr.right)] : null }; });
  if (s && !seen.has(s.text.slice(0, 20))) { seen.add(s.text.slice(0, 20)); console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(s)); if (seen.size <= 6) await page.screenshot({ path: `${OUT}/he-open-${seen.size}.jpg`, type: 'jpeg', quality: 86 }); }
  await page.waitForTimeout(300);
}
await browser.close(); server.close?.(); process.exit(0);
