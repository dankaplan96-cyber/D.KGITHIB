// node walkwatch.mjs <outdir> [id]   HANDS-36 / order 36's last ask: one look at a townsfolk's walk on this machine's GPU (the
// installed Chrome, the game's own loop running, not stepped). Citadel in chapter 1; the walker `id` (default: the first
// walking resident in the square) is filmed from its side at 4.5 m for 12 frames ~0.12 s apart (walk-NN.png), with its
// ground speed and the frame times meanwhile (walk.json). SHELL_EXE=… runs SwiftShader instead (headless).
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const [OUT, WANT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8257/';
const browser = await chromium.launch(process.env.SHELL_EXE ? { executablePath: process.env.SHELL_EXE, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : { channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
for (const [k, v] of Object.entries(process.env)) if (k.startsWith('CAND_') && v) await ctx.route(`**/assets/poly/${k.slice(5)}.json`, (r) => r.fulfill({ path: v, contentType: 'application/json' }));
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a);
await page.goto(BASE + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 1500000 });
await page.click('[data-act="new"]', { timeout: 300000 });
const gpu = await ev(() => { const gl = game.renderer.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
const who = await ev(async (want) => {
  const G = game; G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5);
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.exitRoom({ x: -42, z: -2, a: 0 }, true, true); G.step(1.0);
  const ws = G.npcs.filter((n) => n.pos && n.present !== false && (n.def.speed || 0) > 0.7 && !n.room && Math.hypot(n.pos.x + 42, n.pos.z + 2) < 120);
  const n = (want && ws.find((q) => q.def.id === want)) || ws.sort((a, b) => Math.hypot(a.pos.x + 42, a.pos.z + 2) - Math.hypot(b.pos.x + 42, b.pos.z + 2))[0];
  if (!n) return { none: true, ids: G.npcs.filter((q) => q.pos && q.present !== false).map((q) => q.def.id + ':' + Math.round(q.pos.x) + ',' + Math.round(q.pos.z)).slice(0, 40) };
  window.__w = n;
  const THREE = await import('three');
  const cam = G.renderer.camera || G.camera;
  window.__pre0 ??= G.renderer.pre;
  G.renderer.pre = () => { window.__pre0?.(); const w = window.__w, a = w.angle + Math.PI / 2; const wp = new THREE.Vector3(w.pos.x + Math.sin(a) * 4.5, w.pos.y + 1.3, w.pos.z + Math.cos(a) * 4.5); if (cam.parent) { cam.parent.updateMatrixWorld(true); cam.parent.worldToLocal(wp); } cam.position.copy(wp); cam.lookAt(w.pos.x, w.pos.y + 0.9, w.pos.z); cam.updateMatrixWorld(true); };
  G.hero.pos.set(n.pos.x + 8, G.physics.groundAt(n.pos.x + 8, n.pos.z), n.pos.z); G.step(0.2);
  const hud = document.querySelector('#hud'); if (hud) hud.style.visibility = 'hidden';
  G.testFreeze = false;
  return { id: n.def.id, char: n.def.char, speed: n.def.speed };
}, WANT || null);
console.log('walker', JSON.stringify(who), 'gpu', gpu);
if (who.none) { await browser.close(); process.exit(1); }
await page.waitForTimeout(4000);
const track = [];
for (let i = 0; i < 12; i++) {
  track.push(await ev(() => { const w = window.__w; return { t: performance.now(), x: w.pos.x, z: w.pos.z, anim: w.rig?.anim || w.rig?.cur || null }; }));
  await page.screenshot({ path: path.join(OUT, `walk-${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
  await page.waitForTimeout(60);
}
const frames = await ev(() => new Promise((done) => { const t = []; let last = performance.now(); const t0 = last; const f = (now) => { t.push(now - last); last = now; if (now - t0 < 5000) requestAnimationFrame(f); else done(t); }; requestAnimationFrame(f); }));
const d = track.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - track[i].x, p.z - track[i].z), 0), dt = (track.at(-1).t - track[0].t) / 1000;
const s = [...frames].sort((a, b) => a - b);
const res = { gpu, walker: who, groundSpeed: +(d / dt).toFixed(3), seconds: +dt.toFixed(2), frames: { n: frames.length, p50: +s[Math.floor(s.length / 2)].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2) }, errors: errs };
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
await browser.close();
