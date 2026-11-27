import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
const server = await serve(process.argv[2]);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(900); if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
for (let i = 0; i < 60 && (await page.evaluate(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await page.waitForTimeout(900); await page.keyboard.up('KeyE'); }
const facts = () => page.evaluate(() => { const G = game, E = G.env; return { q: G.settings.quality, auto: G.settings.qualityAuto, shadowMap: E.sun.shadow.mapSize.x, lamps: G.renderer?.lampCount ?? null, label: G.autoQ.state().label, runs: (G.autoQ.report()[1] || '').slice(0, 90) }; });
console.log('start', JSON.stringify(await facts()));
// the menu path: Settings → the Medium chip
for (const v of ['medium', 'high', 'auto']) {
  await page.evaluate((v) => { const b = document.querySelector(`.seg[data-setting="quality"] button[data-v="${v}"]`); b.click(); }, v);
  await page.waitForTimeout(2500); console.log('menu', v, JSON.stringify(await facts()));
}
await browser.close(); server.close?.(); process.exit(0);
