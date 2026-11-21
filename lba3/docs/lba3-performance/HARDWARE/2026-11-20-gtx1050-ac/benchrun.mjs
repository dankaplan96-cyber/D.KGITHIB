// The game's own benchmarks (Pause → Benchmark / Benchmark Auto / Benchmark: Frame Rates) in Chrome on this machine, as a
// player starts them, with the machine's setup recorded. node benchrun.mjs <url> <out.txt> <bench|benchauto|benchfps> [quality|auto]
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [URL0, OUT, ACT, Q = 'auto', W = '1536', H = '864', DPR = '1.25'] = process.argv.slice(2);
const t0 = Date.now();
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=' + (Math.round(W * DPR) + 20) + ',' + (Math.round(H * DPR) + 140), '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DPR });
if (Q !== 'auto') await ctx.addInitScript((q) => { try { const k = 'sunshard_settings_v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.quality = q; s.qualityAuto = false; s.qualityChosenByHand = true; localStorage.setItem(k, JSON.stringify(s)); } catch {} }, Q);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const LOG = OUT.replace(/\.txt$/, '') + '.log'; fs.writeFileSync(LOG, '');
const lg = (s) => fs.appendFileSync(LOG, `[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}` + String.fromCharCode(10));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') lg(m.type() + ' ' + m.text().slice(0, 300)); });
page.on('crash', () => lg('PAGE CRASHED'));
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
// the display's own pace before anything heavy: 120 rAF intervals on the title
const env = await page.evaluate(async () => {
  const iv = []; let last = 0; await new Promise((res) => { let n = 0; const f = (t) => { if (last) iv.push(t - last); last = t; if (++n < 122) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  iv.sort((a, b) => a - b); const c = document.createElement('canvas').getContext('webgl2'), d = c?.getExtension('WEBGL_debug_renderer_info');
  let bat = null; try { const b = await navigator.getBattery(); bat = { charging: b.charging, level: b.level }; } catch {}
  return { ua: navigator.userAgent, gpu: d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : null, rafMedianMs: +iv[60].toFixed(2), refreshHz: +(1000 / iv[60]).toFixed(1), inner: [innerWidth, innerHeight], dpr: devicePixelRatio, screen: [screen.width, screen.height], battery: bat };
});
env.browser = browser.version();
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
for (let i = 0; i < 80; i++) { if (await page.evaluate(() => game.state === 'play')) break; await page.keyboard.press('KeyE'); await page.waitForTimeout(300); }
await page.waitForTimeout(3000);
if (Q !== 'auto') { await page.evaluate((q) => { const G = game; Object.assign(G.settings, { quality: q, qualityAuto: false, qualityChosenByHand: true }); G.applySettings(); G.saveSettings?.(); }, Q); await page.waitForTimeout(4000); }
env.settings = await page.evaluate(() => { const s = game.settings; return { quality: s.quality, qualityAuto: s.qualityAuto, res: s.res, fps: s.fps, aa: s.aa, lang: s.lang }; });
env.drawingBuffer = await page.evaluate(() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; });
const tB = Date.now();
if (!(await page.evaluate(() => game.state === 'play' && !game.cine))) throw new Error('not in play: ' + (await page.evaluate(() => game.state)));
await page.evaluate((a) => { if (a === 'street') { game.bench.run({ qualities: ['medium', 'high'], routes: ['street'], breakdown: false, played: false }).then((t) => { document.querySelector('#bench-out').value = t || 'none'; }); } else game.act(a); }, ACT);
await page.waitForFunction(() => !!game.bench.running || (document.querySelector('#bench-out')?.value || '').length > 50, null, { timeout: 180000, polling: 1000 }).catch(() => { throw new Error('the benchmark did not start'); });
lg('benchmark started: ' + ACT);
const poll = setInterval(async () => { try { const s = await page.evaluate(() => { const G = game; return { room: G.room?.id || G.where?.() || 'out', q: G.settings.quality, fps: G.settings.fps, heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6), pos: [Math.round(G.hero.pos.x), Math.round(G.hero.pos.z)], st: G.state, sc: G.screen }; }); lg(JSON.stringify(s)); } catch (e) { lg('poll failed ' + e.message.split(String.fromCharCode(10))[0]); } }, 10000);
await page.waitForFunction(() => (document.querySelector('#bench-out')?.value || '').length > 50, null, { timeout: 3600000, polling: 2000 });
clearInterval(poll);
const text = await page.evaluate(() => document.querySelector('#bench-out').value);
const head = `# ${ACT} · quality ${Q} · ${new Date().toISOString()} · ran ${Math.round((Date.now() - tB) / 1000)} s\n# env ${JSON.stringify(env)}\n# page errors ${JSON.stringify(errs.slice(0, 5))}\n`;
fs.writeFileSync(OUT, head + text + '\n');
console.log(head + text.slice(0, 600));
await browser.close(); process.exit(0);
