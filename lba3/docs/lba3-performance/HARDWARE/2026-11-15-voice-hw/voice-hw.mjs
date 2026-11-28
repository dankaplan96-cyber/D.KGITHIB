// VOICE-HW (order 41.2): P18's Words voices on the desktop's real hardware. Per line: box open -> first sound (audio clock),
// late worker answers (the line joined where it had got to, 20 ms fade), the render's own time; the main thread's longest
// task while lines render. Classic for comparison. node voice-hw.mjs <chrome|electron> <out.json>
import { chromium, _electron } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [WHERE, OUT, ROOT = 'C:/Users/danka/dev/D.KGITHIB/lba3'] = process.argv.slice(2);
const server = await serve(ROOT);
let page, close;
if (WHERE === 'electron') {
  const app = await _electron.launch({ executablePath: 'C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/electron/dist/electron.exe', args: ['--user-data-dir=C:/Users/danka/dev/lba3-bench/vhw-prof-' + Date.now(), 'C:/Users/danka/dev/lba3-bench/url-gtx'] });
  page = await app.firstWindow(); close = () => app.close();
} else {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1400,860', '--autoplay-policy=no-user-gesture-required'] });
  page = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage(); close = () => b.close();
}
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.evaluate(async () => {
  const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  const V = await import(new URL('src/engine/voice.js', location.href).href);
  window.__V = V; const R = (window.__vhw = { lines: [], long: [], gpu: G.perf?.gpu, style: G.settings?.voiceStyle });
  const ctx = () => G.audio?.ctx;
  const P = V.Babble.prototype, w0 = P._words, s0 = P._speak, wl0 = P._wordsLine;
  const xl0 = P._exprLine; P._exprLine = function (text, hes) { const r = R.cur; if (r && !r.lineAt) { r.lineAt = ctx().currentTime; r.engine = 'expressive'; } return xl0.call(this, text, hes); };
  P._wordsLine = function (text, hes) { const r = R.cur; if (r && !r.lineAt) { r.lineAt = ctx().currentTime; r.engine = 'words'; } return wl0.call(this, text, hes); };
  P._words = function (plan, text, T0, vw, pcm) { const r = R.cur, now = ctx().currentTime; if (r && r.soundAt == null) { r.T0 = T0; r.answeredAt = now; r.late = now > T0; r.rendered = !!pcm; r.renderMs = pcm?.ms ?? null; r.soundAt = Math.max(T0, now); } return w0.call(this, plan, text, T0, vw, pcm); };
  P._speak = function (plan, text, vw, pcm, x) { const r = R.cur; const out = s0.call(this, plan, text, vw, pcm, x); if (r && r.soundAt == null && !vw) { r.engine = r.engine || 'classic'; r.soundAt = ctx().currentTime + 0.03; } return out; };
  const say0 = G.say.bind(G); G.say = (n, lines, ...a) => { R.cur = { who: n, line: String([].concat(lines)[0]).slice(0, 40), openAt: ctx()?.currentTime }; R.lines.push(R.cur); return say0(n, lines, ...a); };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) R.long.push({ at: +e.startTime.toFixed(0), ms: +e.duration.toFixed(0), during: !!R.cur && R.cur.soundAt == null }); }).observe({ type: 'longtask', buffered: false }); } catch { R.noLongTask = true; }
  G.testFreeze = false;
});
const KITCHEN = [['n_arthur', 'op_ar_1'], ['n_hero', 'op_tw_0'], ['n_zoe', 'op_zoe_1'], ['n_hero', 'op_tw_1'], ['n_zoe', 'op_zoe_2'], ['n_arthur', 'op_ar_2'], ['n_zoe', 'op_zoe_3'], ['n_hero', 'op_tw_2'], ['n_zoe', 'op_zoe_4'], ['n_zoe', 'op_zoe_5']];
const STREET = [['n_nara', 'Twelve crates of cloud flowers, and not one can fly.'], ['n_baldino', 'The flue draws again! Did you hear it cough?'], ['n_nara', 'The project tags everything. Even my seedlings.'], ['n_baldino', 'Bring me the gauge, and mind the steam.']];
const play = async (set, tag) => { for (const [n, k] of set) {
  await page.evaluate(([n, k, tag]) => { const G = game; const t = (window.STR_LOOKUP || ((x) => x)); G.say(n, [k]); window.__vhw.cur.set = tag; }, [n, k, tag]);
  await page.waitForTimeout(2600);
  await page.evaluate(() => { const G = game; for (let i = 0; i < 10 && G.state === 'dialog'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } window.__vhw.cur = null; });
  await page.waitForTimeout(300);
} };
for (const style of ['expressive', 'words', 'classic']) {
  await page.evaluate((s) => { window.__V.setVoiceMode(s); }, style);
  await play(KITCHEN, style + ':kitchen');
  await page.evaluate(() => { const G = game; G.regions.ensure('zeelich', 'test'); G.enterRoom('zeelich', G.rooms.zeelich.spawn, true); });
  await page.waitForTimeout(3000);
  await play(STREET, style + ':street');
  await page.evaluate(() => { const G = game; if (G.room) G.exitRoom({ x: -46, z: 70, a: 0 }, true); });
  await page.waitForTimeout(1500);
}
const R = await page.evaluate(() => ({ ...window.__vhw, voiceStyleNow: game.settings.voiceStyle }));
fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
const rows = R.lines.map((l) => ({ set: l.set, who: l.who, engine: l.engine, ms: l.soundAt != null && l.openAt != null ? Math.round((l.soundAt - l.openAt) * 1000) : null, late: l.late ?? null, render: l.renderMs }));
console.log(WHERE, R.gpu, JSON.stringify(rows)); console.log('longest tasks', JSON.stringify(R.long.sort((a, b) => b.ms - a.ms).slice(0, 5)));
await close(); server.close?.(); process.exit(0);
