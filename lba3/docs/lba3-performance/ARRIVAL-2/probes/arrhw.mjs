// ARRIVAL-HW (CLOUD_ORDERS 60.1): the arrivals as a player gets them, in real time on this machine's GPU (Chrome, the game's
// own loop): Citadel → Zeelich, Zeelich → Citadel (the return), the street → the tavern; a cold round (first visits after
// the page loaded) then a warm one. Every frame's interval (rAF timestamps) and whether the screen is black (#fade's
// opacity): per visit the longest frame, the longest black frame, and in view (the fade cleared) the 6 s after: p95,
// the longest, the frames over 33 / 50 ms (a visible hitch).
// node arrhw.mjs <url> <quality: medium|high> <out.json>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [URL0, Q, OUT] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1940,1100', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(2000);
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
for (let i = 0; i < 80; i++) { if (await page.evaluate(() => game.state === 'play')) break; await page.keyboard.press('KeyE'); await page.waitForTimeout(300); }
const env = await page.evaluate((q) => { const G = game; Object.assign(G.settings, { quality: q, qualityAuto: false, qualityChosenByHand: true }); G.applySettings();
  const c = document.createElement('canvas').getContext('webgl2'), d = c?.getExtension('WEBGL_debug_renderer_info');
  // every frame: its rAF time and the fade's opacity
  window.__F = []; const f = document.querySelector('#fade'); const tick = (t) => { window.__F.push([t, +(getComputedStyle(f).opacity || 0), G.room?.id || 'citadel']); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  return { gpu: d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : null, quality: G.settings.quality, dpr: devicePixelRatio, inner: [innerWidth, innerHeight] }; }, Q);
await page.waitForTimeout(4000);
// out of the house onto the street first (not measured), then the visits
await page.evaluate(() => { const G = game; if (G.room) G.exitRoom({ x: -42, z: 2, a: 0 }, false, true); });
await page.waitForTimeout(8000);
const visits = [];
const visit = async (name, fn, secs) => {
  const t0 = await page.evaluate((fn) => { const G = game; const t = performance.now(); (new Function('G', fn))(G); return t; }, fn);
  await page.waitForTimeout(secs * 1000);
  const F = await page.evaluate((t0) => window.__F.filter((r) => r[0] >= t0), t0);
  const iv = []; for (let i = 1; i < F.length; i++) iv.push({ t: F[i][0] - t0, dt: F[i][0] - F[i - 1][0], black: F[i][1] > 0.95, op: F[i][1], room: F[i][2] });
  const black = iv.filter((x) => x.black), lastBlack = black.length ? black[black.length - 1].t : 0;
  const view = iv.filter((x) => !x.black && x.t > lastBlack && x.t <= lastBlack + 6000);
  const fade = iv.filter((x) => !x.black && x.op > 0.02);   // (the fade in and out: drawn, partly covered)
  const p = (a, k) => { const v = a.map((x) => x.dt).sort((m, n) => m - n); return v.length ? +v[Math.min(v.length - 1, Math.floor(k * v.length))].toFixed(1) : null; };
  const r = { name, frames: iv.length, longest: +Math.max(...iv.map((x) => x.dt)).toFixed(1), black: { n: black.length, longest: black.length ? +Math.max(...black.map((x) => x.dt)).toFixed(1) : 0, ms: +(black.reduce((s, x) => s + x.dt, 0)).toFixed(0) },
    fadeLongest: fade.length ? +Math.max(...fade.map((x) => x.dt)).toFixed(1) : 0,
    view6s: { n: view.length, p50: p(view, 0.5), p95: p(view, 0.95), longest: view.length ? +Math.max(...view.map((x) => x.dt)).toFixed(1) : null, over33: view.filter((x) => x.dt > 34).length, over50: view.filter((x) => x.dt > 50).length, hitches: view.filter((x) => x.dt > 34).map((x) => `${x.dt.toFixed(0)}@${(x.t - lastBlack).toFixed(0)}ms`).slice(0, 8) },
    endRoom: iv.length ? iv[iv.length - 1].room : null };
  visits.push(r); console.log(JSON.stringify(r));
};
for (const round of ['cold', 'warm']) {
  await visit(`${round} zeelich (from Citadel)`, "G.enterRoom('zeelich', null, false, true)", 10);
  await visit(`${round} citadel (the return)`, "G.exitRoom({ x: -42, z: 2, a: 0 }, false, true)", 10);
  await visit(`${round} tavern (from the street)`, "G.enterRoom('tavern', null, false, true)", 8);
  await visit(`${round} street (out of the tavern)`, "G.exitRoom({ x: -42, z: 2, a: 0 }, false, true)", 8);
}
fs.writeFileSync(OUT, JSON.stringify({ url: URL0, env, browser: browser.version(), visits, errs: errs.slice(0, 5) }, null, 1));
await browser.close(); process.exit(0);
