// Order 62 FPS30-FEEL (local runner, not in the repo). Citadel street (fixture new-11-town), already loaded, Follow,
// 1366×768, Medium, Frame Rate 30 (or FPS=60). Three tests, RUNS each after one warm-up pass:
//   T1 pan   standing still, turning on the spot (Classic Right held) so the Follow camera sweeps at a constant speed ~5 s
//            (the Follow camera takes no turn keys of its own: camera.js consumes them outside the free orbit)
//   T2 rsr   run along the street, stop, run back (Modern controls: Up, nothing, Down), the camera untouched
//   T3 aim   a mite on the street as the small target: lock on, strafe, turn, charge the magic ball, throw
// Per pass: every rAF callback's timestamp (the browser's frame clock), the drawn frames (tests/lib/smoothrec.js:
// the game's own perf record per drawn frame), the presented frames from a CDP trace (PipelineReporter: PRESENTED_ALL /
// PARTIAL), the game's GPU timer, and smoothrec's motion evenness.
//   node fps30feel.mjs <lba3 root> <outdir>   env: RUNNER=electron|chrome · FPS=30|60 · TESTS=t1,t2,t3 · RUNS=3 · LABEL
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const [ROOT, OUT] = process.argv.slice(2);
const env = process.env;
const PWI = 'C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
const { _electron: electron, chromium } = await import(pathToFileURL(PWI).href);
const RUNNER = env.RUNNER || 'electron', FPS = env.FPS || '30', RUNS = +(env.RUNS ?? 3), LABEL = env.LABEL || '';
const TESTS = (env.TESTS || 't1,t2,t3').split(',');
const VW = 1366, VH = 768;
fs.mkdirSync(OUT, { recursive: true });
const T = path.join(ROOT, 'tests');
const power = () => { try { const o = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Battery | ForEach-Object { $_.BatteryStatus; $_.EstimatedChargeRemaining }"').toString().trim().split(/\s+/); return `${o[0] === '1' ? 'on battery' : o[0] === '2' ? 'plugged in' : 'status ' + o[0]}, ${o[1]} %`; } catch { return '?'; } };
const hz = () => { try { return execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name + \': \' + $_.CurrentRefreshRate + \' Hz\' }) -join \'; \'"').toString().trim(); } catch { return '?'; } };

// the fixture's settings, as tests/smooth-routes.mjs sets them, with this run's Frame Rate
const fixtureLS = () => {
  const j = JSON.parse(fs.readFileSync(path.join(T, 'fixtures/campaign/new-11-town.save.json'), 'utf8'));
  const items = [];
  for (const o of j.origins || []) for (const it of o.localStorage || []) {
    let v = it.value;
    if (it.name === 'sunshard_settings_v1') { const s = JSON.parse(v); Object.assign(s, { camera: 'follow', controls: 'classic', autoControls: 'off', quality: 'medium', qualityAuto: false, res: 'full', fps: FPS, aa: 'msaa', visual: '2026', shake: 'on' }); v = JSON.stringify(s); }
    items.push([it.name, v]);
  }
  return items;
};

let app = null, browser = null, page, ctx;
const t00 = Date.now();
if (RUNNER === 'electron') {
  const PROFILE = 'C:/Users/danka/dev/lba3-bench/electron-profile-feel-' + Date.now();
  fs.mkdirSync(PROFILE, { recursive: true });
  app = await electron.launch({ executablePath: 'C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/electron/dist/electron.exe', args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--user-data-dir=' + PROFILE, path.join(ROOT, 'desktop'), '--windowed'] });
  page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }, s) => { const w = BrowserWindow.getAllWindows()[0]; w.setFullScreen(false); w.setContentSize(s[0], s[1]); w.setPosition(0, 0); w.setAlwaysOnTop(true, 'screen-saver'); w.focus(); }, [VW, VH]);
  ctx = page.context();
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 600000, polling: 500 });
  await page.evaluate((items) => { for (const [k, v] of items) localStorage.setItem(k, v); }, fixtureLS());
  await page.reload();
} else {
  browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--window-position=0,0', '--window-size=1400,920', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
  page = await ctx.newPage();
  await page.goto(env.GAME_URL + '?nocine', { waitUntil: 'load', timeout: 300000 });
  await page.evaluate((items) => { for (const [k, v] of items) localStorage.setItem(k, v); }, fixtureLS());
  await page.reload();
}
const errs = [];
page.on('pageerror', (e) => errs.push('page error: ' + e.message));
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 600000, polling: 500 });
await page.evaluate(() => { game.testFreeze = true; });
await page.addScriptTag({ content: fs.readFileSync(path.join(T, 'lib/player.js'), 'utf8') });
await page.click('[data-act="continue"]', { timeout: 120000 });
await page.waitForFunction(() => game.state === 'play' && !game.preparing, null, { timeout: 300000, polling: 250 });
await page.evaluate(() => { game.testFreeze = true; game.step(0.2); P.settle(); });
await page.addScriptTag({ content: fs.readFileSync(path.join(T, 'lib/smoothrec.js'), 'utf8') });
if (env.DAMAGE) await page.evaluate(() => { window.__DMG = true; });
const setup = await page.evaluate(() => {
  const G = game, R = G.renderer, V = G.hero.pos.constructor;
  // every rAF callback's timestamp while __rafOn
  window.__raf = []; window.__rafOn = false;
  const raf0 = window.requestAnimationFrame.bind(window);
  // DAMAGE=1 (diagnosis only): a 1 px element changed on every callback, so every refresh has something new to show
  const dmg = window.__DMG ? Object.assign(document.body.appendChild(document.createElement('div')), {}) : null;
  if (dmg) dmg.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;background:#000;z-index:99999;pointer-events:none';
  let dmgK = 0;
  window.requestAnimationFrame = (cb) => raf0((t) => { if (window.__rafOn) window.__raf.push(t); if (dmg) dmg.style.opacity = (dmgK++ & 1) ? '0.99' : '1'; cb(t); });
  const modern = (on) => { G.settings.controls = on ? 'modern' : 'classic'; G.applySettings(); };
  const mark = (n) => ({ at() { performance.mark(n); window.__rafOn = n === 'feel-rec0'; } });
  const S = { start: [-38, 4], a: -1.78 };
  let mite = null;
  window.TESTS = {
    t1() { return { cmds: [{ at() { modern(false); SM.seed(11); SM.place(S.start[0], S.start[1], S.a); } }, { d: 1.5, keys: [] }, { rec: true }, mark('feel-rec0'),
      { d: 5.0, keys: ['ArrowRight'] }, { d: 0.5, keys: [] }, mark('feel-rec1'), { rec: false }], objs: {} }; },
    t2() { return { cmds: [{ at() { modern(true); SM.seed(12); SM.place(S.start[0], S.start[1], S.a); } }, { d: 1.5, keys: [] }, { rec: true }, mark('feel-rec0'),
      { d: 2.5, keys: ['ArrowUp'] }, { d: 1.0, keys: [] }, { d: 2.5, keys: ['ArrowDown'] }, { d: 1.0, keys: [] }, mark('feel-rec1'), { rec: false }, { at() { modern(false); } }], objs: {} }; },
    t3() { const h = G.hero; const R = { cmds: [
      { at() {
        modern(true); SM.seed(23);
        mite = G.enemies.find((e) => e.id === 'mite0');
        if (mite) { const x = -44.8, z = 2.5; mite.pos.set(x, G.physics.groundAt(x, z), z); mite.home = { x, z }; mite.setPresent(true); mite.state = 'idle'; mite.hp = mite.maxHp = 99; mite.sync?.(); }
        if (G.targeting?.lock) G.targeting.release();
        h.hasBall = true; h.combat.equip?.('ball'); G.ball.state = 'idle';
        SM.place(S.start[0], S.start[1], S.a);
        R.objs = { mite: () => (mite ? new V(mite.pos.x, mite.pos.y + 0.4, mite.pos.z) : null), ring: () => (G.ball?.landMark?.visible ? G.ball.landMark.position : null), ball: () => (G.ball && G.ball.state !== 'idle' && G.ball.state !== 'held' ? G.ball.pos : null) };
      } },
      { d: 1.5, keys: [] }, { rec: true }, mark('feel-rec0'),
      { d: 0.05, keys: ['KeyL'] }, { d: 0.4, keys: [] },                          // lock on
      { d: 1.4, keys: ['ArrowRight'] },                                           // strafe round it
      { d: 0.05, keys: ['KeyL'] }, { d: 0.2, keys: [] },                          // lock off
      { d: 0.6, keys: ['ArrowLeft'] }, { d: 0.6, keys: ['ArrowUp'] }, { d: 0.2, keys: [] },   // turn
      { d: 0.05, keys: ['KeyL'] }, { d: 0.3, keys: [] },                          // aim: lock again
      { d: 1.0, keys: ['KeyF'] }, { d: 1.6, keys: [] },                           // charge, release: the throw
      mark('feel-rec1'), { rec: false }, { at() { if (G.targeting?.lock) G.targeting.release(); if (mite) mite.setPresent(false); modern(false); } }],
      each() { h.hp = h.maxHp; }, objs: {} }; return R; },
  };
  G.renderer.timer = G.perf.gpuTimer;
  G.testFreeze = false;
  return { gpu: G.perf.gpu, timer: !!G.perf.gpuTimer, pr: R.pixelRatio(), scale: R.effScale?.(), msaa: R.composer?.renderTarget1?.samples, quality: G.settings.quality, fps: G.settings.fps, dpr: devicePixelRatio, view: `${innerWidth}x${innerHeight}`, version: G.version, ua: navigator.userAgent.match(/(Electron|Chrome)\/[\d.]+/g)?.join(' '), power: G.power?.describe?.() ?? null };
});
setup.winPower = power(); setup.display = hz(); setup.runner = RUNNER;
console.log(`setup ${JSON.stringify(setup)} (${((Date.now() - t00) / 1000).toFixed(0)} s)`);
await page.waitForTimeout(4000);

const cdp = await ctx.newCDPSession(page);
const pc = (a, p) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
const r1 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10) / 10);
const stats = (iv) => ({ n: iv.length, p50: r1(pc(iv, 0.5)), p95: r1(pc(iv, 0.95)), p99: r1(pc(iv, 0.99)), max: r1(iv.length ? Math.max(...iv) : null), ge45: iv.filter((x) => x >= 45).length, lt25: iv.filter((x) => x < 25).length });
const diffs = (t) => t.slice(1).map((x, i) => x - t[i]);

async function pass(name) {
  const chunks = [];
  const onData = (e) => { for (const v of e.value) chunks.push(v); };
  cdp.on('Tracing.dataCollected', onData);
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['disabled-by-default-devtools.timeline.frame', 'blink.user_timing', 'cc', 'viz'], recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
  if (app) await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setAlwaysOnTop(true, 'screen-saver'); w.focus(); });
  await page.evaluate((name) => { game.foreground?.(); window.__bg = 0; clearInterval(window.__bgI); window.__bgI = setInterval(() => { if (game.background) window.__bg++; }, 50); window.__raf = []; const G = game; if (G.perf.gpuTimer) { G.perf.gpuTimer.stride = 1; G.perf.gpuTimer.reset(); } G.perf.reset(); SM.run(TESTS[name]()); }, name);
  await page.waitForFunction(() => SM.route.done, null, { polling: 250, timeout: 120000 });
  const raw = await page.evaluate(() => ({ F: SM.F.map((f) => ({ t: f.t, st: f.st, trans: f.trans, hero: f.hero, cam: f.cam, dir: f.dir, look: f.look, objs: f.objs, root: f.root })), P: SM.P, raf: window.__raf.slice(), gpu: game.perf.gpuTimer ? game.perf.gpuTimer.ms.slice() : [], bg: window.__bg, m0: performance.getEntriesByName('feel-rec0').pop()?.startTime, m1: performance.getEntriesByName('feel-rec1').pop()?.startTime }));
  await cdp.send('Tracing.end'); await done;
  cdp.off('Tracing.dataCollected', onData);
  const marks = chunks.filter((e) => e.cat?.includes('blink.user_timing') && (e.name === 'feel-rec0' || e.name === 'feel-rec1'));
  const a = Math.max(...marks.filter((e) => e.name === 'feel-rec0').map((e) => e.ts)), b = Math.max(...marks.filter((e) => e.name === 'feel-rec1').map((e) => e.ts));
  const pr = chunks.filter((e) => e.name === 'PipelineReporter' && e.ph === 'b' && e.args?.frame_reporter && e.ts >= a && e.ts <= b);
  if (env.DUMP) fs.writeFileSync(path.join(OUT, 'pr-dump.json'), JSON.stringify(chunks.filter((e) => e.name === 'PipelineReporter' && e.ts >= a && e.ts <= b).slice(0, 400)));
  const presented = pr.filter((e) => /PRESENTED/.test(e.args.frame_reporter.state)).map((e) => e.ts / 1000).sort((x, y) => x - y);
  const dropped = pr.filter((e) => /DROPPED/.test(e.args.frame_reporter.state)).length;
  const drawn = raw.F.map((f) => f.t);
  // each drawn game frame's image on screen: the first presented frame whose begin time is at or after the drawn frame's
  // rAF time (the rAF timestamp is the frame's begin time; a dropped one shows in the next presented frame)
  const off = a / 1000 - raw.m0;   // trace ms = page ms + off (both marks are the same performance.mark)
  const shown = [], late = [];
  for (const t of drawn) { const T = t + off; const p = presented.find((x) => x >= T - 1); if (p == null) continue; late.push(p - T); if (!shown.length || p > shown[shown.length - 1] + 0.5) shown.push(p); }
  return { raw, marks: marks.length, rafS: stats(diffs(raw.raf)), drawnS: stats(diffs(drawn)), presS: stats(diffs(presented)), shownS: stats(diffs(shown)), lateS: { p50: r1(pc(late, 0.5)), p95: r1(pc(late, 0.95)), max: r1(late.length ? Math.max(...late) : null), over8: late.filter((x) => x > 8).length, n: late.length }, presented: presented.length, dropped, dur: r1((b - a) / 1e6),
    gpu: { p50: r1(pc(raw.gpu, 0.5)), p95: r1(pc(raw.gpu, 0.95)) }, cpu: { p50: r1(pc(raw.P.map((p) => p.sim + p.render), 0.5)), p95: r1(pc(raw.P.map((p) => p.sim + p.render), 0.95)) }, presentedTs: presented };
}
// motion evenness (smooth-routes.mjs's measure, compact): speed spikes > 1.5× the neighbours' mean while moving
function spikes(F, get, floor) {
  const S = F.map((f) => { const o = get(f); return o && f.st === 'play' && !f.trans ? { t: f.t, w: o } : null; });
  const v = []; for (let i = 1; i < S.length; i++) { const p = S[i - 1], q = S[i]; v.push(p && q && q.t > p.t ? Math.hypot(q.w[0] - p.w[0], q.w[1] - p.w[1], q.w[2] - p.w[2]) / ((q.t - p.t) / 1000) : null); }
  let n = 0, s = 0; for (let i = 1; i < v.length - 1; i++) { if (v[i - 1] == null || v[i] == null || v[i + 1] == null) continue; if (Math.min(v[i - 1], v[i + 1]) <= floor) continue; n++; const r = v[i] / ((v[i - 1] + v[i + 1]) / 2); if (r > 1.5 || r < 1 / 1.5) s++; }
  return `${s}/${n}`;
}
const rows = [];
for (const name of TESTS) for (let k = -1; k < RUNS; k++) {
  const r = await pass(name);
  if (k < 0) { console.log(`${name} warm-up: ${r.raw.F.length} drawn`); continue; }
  const row = { test: name, run: k + 1, bg50ms: r.raw.bg, power: power(), dur: r.dur, raf: r.rafS, drawn: r.drawnS, pres: r.presS, shown: r.shownS, late: r.lateS, presented: r.presented, dropped: r.dropped, gpu: r.gpu, cpu: r.cpu,
    motion: { hero: spikes(r.raw.F, (f) => f.hero?.w, 0.3), cam: spikes(r.raw.F, (f) => f.cam, 0.3), view: spikes(r.raw.F, (f) => f.dir, 0.1), ring: spikes(r.raw.F, (f) => f.objs?.ring?.w, 0.3) } };
  rows.push(row);
  fs.writeFileSync(path.join(OUT, `${name}-${k + 1}.json`), JSON.stringify({ setup, ...row, presentedTs: r.presentedTs, raf: r.raw.raf, F: r.raw.F, P: r.raw.P, gpu: r.raw.gpu }));
  const s = (x) => `${x.p50}/${x.p95}/${x.p99}/${x.max} ≥45:${x.ge45} <25:${x.lt25} (n ${x.n})`;
  console.log(`${name} #${k + 1} [${row.power}${row.bg50ms ? ' BACKGROUND ' + row.bg50ms : ''}] ${r.dur}s | rAF ${s(r.rafS)} | drawn ${s(r.drawnS)} | compositor presents ${s(r.presS)} dropped ${r.dropped} | game images shown ${s(r.shownS)} · shown after own frame p50/p95/max ${r.lateS.p50}/${r.lateS.p95}/${r.lateS.max} >8ms ${r.lateS.over8}/${r.lateS.n} | GPU ${r.gpu.p50}/${r.gpu.p95} CPU ${r.cpu.p50}/${r.cpu.p95} | spikes hero ${row.motion.hero} cam ${row.motion.cam} view ${row.motion.view} ring ${row.motion.ring}`);
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ setup, label: LABEL, rows }, null, 1));
if (errs.length) console.log('page errors: ' + errs.slice(0, 5).join(' | '));
console.log(`(${((Date.now() - t00) / 60000).toFixed(1)} min)`);
if (app) await app.close(); else await browser.close();
