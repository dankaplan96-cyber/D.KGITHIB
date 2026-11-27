// ORDER 79 (#25): the GTX 1050, once and lightly, at DEPTH-LOOK's eight places (captures/depth-look/depthshots.mjs),
// headed Chrome (the high-performance preference: the GTX), 1366x768, the play camera (Follow, Far), a new game at noon.
// Per place and preset (High, Medium, then Auto): 3 s to settle, then 6 s of rAF intervals: fps, p50, p95, the share
// over 20 ms; under Auto also the step it is on. Nothing else runs.
// usage: node perf79.mjs <OUT> <lba3 ROOT>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const logf = `${OUT}/perf79.log`; fs.writeFileSync(logf, '');
const log = (...a) => { const s = a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(logf, s + '\n'); };
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
const ev = (f, a) => page.evaluate(f, a); const wait = (ms) => page.waitForTimeout(ms);
await page.click('[data-act="new"]'); await wait(900); if (await ev(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
for (let i = 0; i < 60 && (await ev(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await wait(900); await page.keyboard.up('KeyE'); }
await ev(() => { const G = game; G.flags.pr_tut2 = false; G.settings.camera = 'follow'; G.settings.camDist = 'far'; G.settings.res = 'full'; G.applySettings(); });
log('GPU', await ev(() => { const g = game.renderer.renderer.getContext(); const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; }), 'view', await ev(() => [innerWidth, innerHeight, devicePixelRatio]), 'fps setting', await ev(() => game.settings.fps));
await ev(() => { const M = window.FM = { iv: [], last: performance.now() }; const f = (t) => { M.iv.push(t - M.last); M.last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
const PLACES = [
  ['fortwall', { x: -68.4, z: 1.5, a: -1.5708 }], ['square', { x: -42, z: -2, a: 0.6 }], ['harbour', { x: -107, z: 37, a: -1.2 }],
  ['house', { room: 'house', t: 2.5 }], ['zeelich', { room: 'zeelich', t: 2 }], ['desert', { room: 'desert', t: 2 }],
  ['lhar', { room: 'hamalayi', near: 'lhar', dz: 6, a: Math.PI, t: 2 }], ['island', { room: 'isle_celebration', t: 2 }],
];
const place = (s) => ev((s) => { const G = game, h = G.hero;
  if (s.near) { const R = G.rooms[s.room], q = s.near.split('.').reduce((o, k) => o[k], R); s.x = q.x + (s.dx || 0); s.z = q.z + (s.dz || 0); }
  if (s.room) { if (G.room?.id !== s.room) G.enterRoom(s.room, s.x != null ? { x: s.x, z: s.z, a: s.a } : null, true, true); else if (s.x != null) h.pos.set(s.x, G.physics.groundAt(s.x, s.z), s.z); }
  else G.exitRoom({ x: s.x, z: s.z, a: s.a ?? 0 }, true, true);
  if (s.a != null) h.angle = s.a; G.camRig.snap?.(); return G.room?.id || 'citadel'; }, s);
const measure = () => ev(() => { const iv = window.FM.iv.splice(0).sort((a, b) => a - b), n = iv.length, sum = iv.reduce((a, b) => a + b, 0);
  return { fps: +(n / (sum / 1000)).toFixed(1), p50: +iv[Math.floor(n * 0.5)].toFixed(1), p95: +iv[Math.floor(n * 0.95)].toFixed(1), over20: +(100 * iv.filter((d) => d > 20).length / n).toFixed(1), step: game.autoQ?.state?.()?.label || game.settings.quality }; });
for (const q of ['high', 'medium', 'auto']) {
  await ev((q) => { const G = game; if (q === 'auto') { G.settings.qualityAuto = true; } else { G.settings.qualityAuto = false; G.settings.quality = q; } G.applySettings(); G.warmGraphics?.(); }, q);
  for (const [name, s] of PLACES) {
    try { await place(s); } catch (e) { log('place fail', name, String(e).slice(0, 120)); continue; }
    await wait(q === 'auto' ? 8000 : 3000); await ev(() => window.FM.iv.splice(0)); await wait(6000);
    log(`${q.padEnd(6)} ${name.padEnd(8)}`, await measure());
  }
}
log('autoQ.report()', await ev(() => { try { return game.autoQ.report(); } catch (e) { return String(e); } }));
await browser.close(); server.close?.(); process.exit(0);
