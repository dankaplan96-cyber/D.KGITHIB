// node gpuperf.mjs <label>   env CAND_<look>=file as gamecap.mjs. The installed Chrome on this machine's GPU (Vega 8),
// the real game's own loop (testFreeze off), Citadel's village square at the gamecap spot, Twinsen standing (Follow,
// Medium), then Zoé (swapBody) at the same spot: frame times over 20 s each from requestAnimationFrame, plus
// renderer.info for one frame. Light check only (other agents use the machine: the numbers are noisy).
import fs from 'node:fs';
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const LABEL = process.argv[2] || 'run';
const BASE = process.env.BASE || 'http://127.0.0.1:8257/';
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
for (const [k, v] of Object.entries(process.env)) if (k.startsWith('CAND_') && v) await ctx.route(`**/assets/poly/${k.slice(5)}.json`, (r) => r.fulfill({ path: v, contentType: 'application/json' }));
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a);
await page.goto(BASE + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 1500000 });
await page.click('[data-act="new"]', { timeout: 300000 });
const gpu = await ev(() => { const gl = game.renderer.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
await ev(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } });
const res = { label: LABEL, gpu, settings: null, runs: {} };
for (const look of ['twinsen', 'zoe']) {
  await ev((look) => { const G = game, h = G.hero, S = { x: -39.88, z: 0.12, a: Math.atan2(-42 + 39.88, -2 - 0.12) };
    G.exitRoom(S, true, true); G.step(0.5); if (look !== 'twinsen') h.swapBody(look); else if (h.body && h.body !== 'twinsen') h.swapBody('twinsen');
    h.pos.set(S.x, G.physics.groundAt(S.x, S.z), S.z); h.angle = S.a; G.camRig.snap?.(); G.step(1.5); G.testFreeze = false; }, look);
  await page.waitForTimeout(6000);   // (warm up: shaders, the first frames)
  const r = await ev(() => new Promise((done) => { const t = []; let last = performance.now(); const t0 = last; const f = (now) => { t.push(now - last); last = now; if (now - t0 < 20000) requestAnimationFrame(f); else done(t); }; requestAnimationFrame(f); }));
  const info = await ev(() => { const rd = game.renderer.renderer; return { calls: rd.info.render.calls, triangles: rd.info.render.triangles, programs: rd.info.programs?.length, geometries: rd.info.memory.geometries, textures: rd.info.memory.textures }; });
  await ev(() => { game.testFreeze = true; });
  const s = [...r].sort((a, b) => a - b), q = (p) => +s[Math.floor(p * (s.length - 1))].toFixed(2);
  res.runs[look] = { frames: r.length, meanMs: +(r.reduce((a, b) => a + b, 0) / r.length).toFixed(2), p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1), info };
  console.log(look, JSON.stringify(res.runs[look]));
}
res.settings = await ev(() => ({ quality: game.settings.quality, res: game.settings.res, fps: game.settings.fps, camDist: game.settings.camDist }));
res.errors = errs;
fs.writeFileSync(`gpu-${LABEL}.json`, JSON.stringify(res, null, 1));
console.log('gpu', gpu, 'errors', errs.length);
await browser.close();
