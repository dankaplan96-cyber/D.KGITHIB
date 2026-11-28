// CPU-RELIEF: V8's optimisation and deoptimisation trace for the game's functions on the Citadel street (Medium), the
// renderer's output through Playwright's browser log (DEBUG=pw:browser), then summarised: every function deoptimised
// during the street's 600 frames (after the warm-up mark), with how often and why.
//   DEBUG=pw:browser GAME_URL=http://localhost:8347/ node deopt.mjs 2>&1 | grep -E 'bailout|DEOPT-PROBE' > d.txt; python3 -I deoptsum.py d.txt
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8347/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-logging=stderr', `--js-flags=--trace-opt --trace-deopt ${process.env.FLAGS || ''}`] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 4, v: 2, fps: 'auto' })); } catch {} });
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 600000 });
await page.waitForFunction(() => window.game && game.screen === 'title' && !game.preparing && !game.gfxHold, null, { timeout: 900000, polling: 1000 });
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await page.evaluate(() => game.bench.prepareAreas());
// (ROUTES=street,interior,combat,arrival: each route warmed 300 frames, then 600 traced after its mark)
for (const id of (process.env.ROUTES || 'street').split(',')) {
  await page.evaluate((id) => {
    const G = game, route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; route.setup(); G.state = 'play'; window.__r = route; window.__t = 0;
    for (let i = 0; i < 300; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 2 === 0); }
  }, id);
  console.error('DEOPT-PROBE: ' + id);
  await page.evaluate(() => { const G = game; for (let i = 0; i < 600; i++) { window.__t += 1 / 60; window.__r.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 2 === 0); } });
}
console.error('DEOPT-PROBE: done');
await browser.close();
