// ORDER 77: the ending film's cuts on this GPU: a hitch or not (frame intervals around each cut); no pictures.
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const ROOT = process.argv[2];
const server = await serve(ROOT); const origin = new URL(server.url).origin;
const st = JSON.parse(fs.readFileSync(`${ROOT}/tests/fixtures/campaign/new-15-last.save.json`, 'utf8').replaceAll('http://localhost:9201', origin)); for (const o of st.origins || []) o.origin = origin;
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState: st })).newPage();
await page.goto(server.url, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 });
await page.waitForTimeout(3000);
const r = await page.evaluate(async () => {
  const G = game, E = G.story.chapters.find((c) => c.key === 'home'); if (!E?.film) return 'no epilogue film';
  const fr = []; let last = performance.now(), on = true; const tick = (t) => { fr.push([t, t - last]); last = t; if (on) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  const cuts = []; let shot = null;
  const t0 = performance.now();
  await new Promise((res) => { try { E.film(res); } catch (e) { res(); } const poll = setInterval(() => { const s = E.ending?.shot ?? E.ending?.i ?? E.ending?.cur ?? null; if (s !== shot) { cuts.push([performance.now(), s]); shot = s; } if (!E.ending) { clearInterval(poll); res(); } }, 16); setTimeout(res, 120000); });
  on = false; const T = performance.now() - t0;
  const body = fr.filter(([t]) => t > t0 + 500);
  const sorted = body.map(([, d]) => d).sort((a, b) => a - b); const med = sorted[Math.floor(sorted.length / 2)];
  const spikes = body.filter(([, d]) => d > Math.max(50, med * 3)).map(([t, d]) => [+((t - t0) / 1000).toFixed(2), Math.round(d)]);
  return { secs: +(T / 1000).toFixed(1), frames: body.length, cutsSeen: cuts.map(([t, s]) => [+((t - t0) / 1000).toFixed(2), s]).slice(0, 20), spikes };
});
console.log(JSON.stringify(r));
await browser.close(); server.close?.(); process.exit(0);
