// node zeecap.mjs <outdir>   env CAND_<look>=<file> as gamecap.mjs; SHELL_EXE (a renamed headless shell); GPU=1: the installed
// Chrome on this machine's GPU, frame times only (20 s, the game's own loop). KEY/FLAGS: another chapter by its flags (as
// tests/cast-rounds.mjs); ROOM: another outdoor room (an isle: isle_platform…; needs KEY); IDS: only these people (comma list) framed, viewed close and spoken to.
// The real game (?nocine, new game), chapter 3 by its flags (as tests/zeelich-life.mjs): Zeelich's street, where the Esmers
// live. Pictures (chapter 3+: NOT for the user): street-follow.png (Twinsen facing the street's Esmers, Follow camera at the
// player's distance), dialogue-<id>.png (the game's own two-shot with an Esmer), esmer-<id>.png (a fixed 2.6 m 3/4 view of
// each Esmer present, the street's light); info.json: the Esmers present (id, look), renderer.info for the street frame.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8257/', GPU = !!process.env.GPU;
const browser = await chromium.launch(GPU ? { channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] } : { ...(process.env.SHELL_EXE ? { executablePath: process.env.SHELL_EXE } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
// ROUTES="src/game/roomlife.js=C:/…/roomlife.before.js;…": serve these files from elsewhere (a before run of a change in the code)
for (const r of (process.env.ROUTES || '').split(';').filter(Boolean)) { const [u, f] = r.split('='); await ctx.route('**/' + u, (q) => q.fulfill({ path: f, contentType: 'text/javascript' })); }
for (const [k, v] of Object.entries(process.env)) if (k.startsWith('CAND_') && v) { console.log('candidate', k.slice(5), v); await ctx.route(`**/assets/poly/${k.slice(5)}.json`, (r) => r.fulfill({ path: v, contentType: 'application/json' })); }
await ctx.addInitScript(() => { let a = 0x2f6b1d; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a);
const t0 = Date.now(); const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
await page.goto(BASE + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 1500000 });
await ev(() => { game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 300000 });
const ROOM = process.env.ROOM || 'zeelich', KEY = process.env.KEY || null, FLAGS = JSON.parse(process.env.FLAGS || '{}'), IDS = process.env.IDS ? process.env.IDS.split(',') : null;
const R = await ev(async ({ KEY, FLAGS, ROOM, IDS }) => {
  const G = game; G.testFreeze = true; G.step(0.2);
  window.T = { talkAll(max = 120) { for (let i = 0; i < max && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); } };
  T.talkAll();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(1); T.talkAll(); G.step(1); T.talkAll();
  if (KEY) {   // (another chapter by its flags, as tests/cast-rounds.mjs setChapter: e.g. KEY=council FLAGS={"c9_started":true,"c9_form":true})
    const RG = await import('/src/game/regions.js'), f = G.flags, base = JSON.parse(JSON.stringify(f));
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, base, { prologueDone: true, intro: true, chapterKey: KEY, c1_water: true, c1_done: true }, FLAGS);
    f.chapter = G.story.chapters.findIndex((c) => c.key === KEY); G.hero.hasBall = true;
    for (const id of RG.CHAPTER_AREAS[KEY] || []) G.regions.ensure(id, 'test');
    G.story.applyFlags(); G.step(0.2);
    if (ROOM !== 'zeelich') G.regions.ensure(ROOM, 'test');
    if (G.room?.id !== ROOM) G.enterRoom(ROOM, null, true, true);
    G.story.refreshCast(); G.step(1); T.talkAll();
  }
  const CH = await import('/src/game/characters.js');
  const es = G.npcs.filter((n) => n.present !== false && n.pos && n.group?.visible !== false && (ROOM !== 'zeelich' || CH.LOOKS[n.def.char]?.race === 'esmer') && (IDS ? IDS.includes(n.def.id) : Math.abs(n.pos.x - G.hero.pos.x) < 80));
  return { room: G.room?.id, chapterKey: G.flags.chapterKey, hero: [G.hero.pos.x, G.hero.pos.z], esmers: es.map((n) => ({ id: n.def.id, char: n.def.char, x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2) })) };
}, { KEY, FLAGS, ROOM, IDS });
if (IDS) R.esmers = R.esmers.filter((e) => IDS.includes(e.id));
log(JSON.stringify(R));
const shot = async (name, hideHud = true) => { await ev((h) => { const hud = document.querySelector('#hud'); if (hud) hud.style.visibility = h ? 'hidden' : ''; game.renderer.render(); }, hideHud); await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 300000 }); log('shot', name); };
// the street: Twinsen 7 m from the Esmers' middle, facing it (the Follow camera behind him at the player's distance)
const street = await ev((ids) => {
  const G = game, h = G.hero, CHs = G.npcs.filter((n) => n.present !== false && n.pos && ids.includes(n.def.id));
  if (!CHs.length) return null;
  for (const n of CHs) { n.def.speed = 0; n._round = null; }
  const cx = CHs.reduce((a, n) => a + n.pos.x, 0) / CHs.length, cz = CHs.reduce((a, n) => a + n.pos.z, 0) / CHs.length;
  let best = null;
  for (let k = 0; k < 16 && !best; k++) { const a = k / 16 * 6.283, x = cx + Math.sin(a) * 7, z = cz + Math.cos(a) * 7; if (!G.physics.blockedAt?.(x, z, G.physics.groundAt(x, z, 30) + 0.5, 0.4)) best = { x, z, a: Math.atan2(cx - x, cz - z) }; }
  best ??= { x: cx, z: cz + 7, a: Math.PI };
  h.pos.set(best.x, G.physics.groundAt(best.x, best.z, 30), best.z); h.angle = best.a; h.onGround = true; h.vy = 0;
  G.camRig.lba && (G.camRig.lba.init = false); G.camRig.snap?.(); G.step(1.5);
  const rd = G.renderer.renderer; rd.info.autoReset = false; rd.info.reset(); G.renderer.render(); const info = { calls: rd.info.render.calls, triangles: rd.info.render.triangles }; rd.info.autoReset = true;
  return { at: best, centre: [cx, cz], n: CHs.length, info, settings: { camera: G.settings.camera, camDist: G.settings.camDist, quality: G.settings.quality } };
}, R.esmers.map((e) => e.id));
log('street', JSON.stringify(street));
const res = { ...R, street, gpu: GPU };
if (GPU) {
  res.renderer = await ev(() => { const gl = game.renderer.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
  await ev(() => { game.testFreeze = false; }); await page.waitForTimeout(6000);
  const r = await ev(() => new Promise((done) => { const t = []; let last = performance.now(); const t0 = last; const f = (now) => { t.push(now - last); last = now; if (now - t0 < 20000) requestAnimationFrame(f); else done(t); }; requestAnimationFrame(f); }));
  const s = [...r].sort((a, b) => a - b), q = (p) => +s[Math.floor(p * (s.length - 1))].toFixed(2);
  res.frames = { n: r.length, meanMs: +(r.reduce((a, b) => a + b, 0) / r.length).toFixed(2), p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) };
  log('frames', JSON.stringify(res.frames));
} else {
  await shot('street-follow');
  // close views of each Esmer present (3/4, 2.6 m, their head height)
  for (const e of R.esmers) {
    await ev(async (id) => {
      const THREE = await import('three'); const G = game, n = G.npcs.find((q) => q.def.id === id); if (!n) return;
      const hp = new THREE.Vector3(); (n.rig.j.head || n.rig.root).getWorldPosition(hp);
      const cam = G.renderer.camera || G.camera, a = n.angle + 0.6;
      const aim = () => { const wp = new THREE.Vector3(hp.x + Math.sin(a) * 2.6, hp.y - 0.1, hp.z + Math.cos(a) * 2.6); if (cam.parent) { cam.parent.updateMatrixWorld(true); cam.parent.worldToLocal(wp); } cam.position.copy(wp); cam.lookAt(hp.x, hp.y - 0.75, hp.z); cam.updateMatrixWorld(true); };
      window.__pre0 ??= G.renderer.pre; G.renderer.pre = () => { window.__pre0?.(); aim(); };
    }, e.id);
    await shot('esmer-' + e.id);
    await ev(() => { game.renderer.pre = window.__pre0; });
  }
  // the game's dialogue two-shot with the first Esmer who talks (oku, then nara, then any)
  const order = [...R.esmers].sort((a, b) => (a.id === 'oku' ? -2 : a.id === 'nara' ? -1 : 0) - (b.id === 'oku' ? -2 : b.id === 'nara' ? -1 : 0));
  for (const e of order) {
    const t = await ev((id) => { const G = game, h = G.hero, n = G.npcs.find((q) => q.def.id === id); if (!n) return null;
      h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z);
      G.camRig.snap?.(); G.step(1.0); G.input.taps.add('KeyE'); G.step(0.05); if (G.state === 'dialog') { G.step(1.2); return id; } return null; }, e.id);
    if (t) { await shot('dialogue-' + t, false); res.dialogue = t; break; }
  }
}
res.errors = errs; res.at = new Date().toISOString(); res.candidates = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('CAND_')));
fs.writeFileSync(path.join(OUT, GPU ? 'gpu.json' : 'info.json'), JSON.stringify(res, null, 1));
log('done; errors', errs.length, errs.slice(0, 5));
await browser.close();
