// node gamecap.mjs <outdir>   env: CAND_<look>=<file> replaces assets/poly/<look>.json (Playwright route); GPU=1: installed Chrome on the GPU
// The real game (?nocine, new game, chapter 1), Citadel's village: for each look (twinsen as himself, zoe via swapBody):
//   follow-medium.png (the Follow camera at Medium, as he stands), follow-34.png (turned toward the camera),
//   dialogue.png (an outdoor talk: the game's two-shot), closeup*.png (a fixed 1.9 m view of the face),
//   poses/<pose>.png (a second rig of the same look at a clear spot, the real scene's lights, fixed 3.4 m camera),
//   and info.json: triangles / draw calls the hero adds to the game's frame (renderer.info).
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8257/', GPU = !!process.env.GPU;
const LOOKSWANT = (process.env.LOOKS || 'twinsen,zoe').split(',');
const SKIP_POSES = !!process.env.SKIP_POSES;
const browser = await chromium.launch(GPU ? { channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist'] } : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
for (const [k, v] of Object.entries(process.env)) if (k.startsWith('CAND_') && v) { const look = k.slice(5); console.log('candidate', look, v); await ctx.route(`**/assets/poly/${look}.json`, (r) => r.fulfill({ path: v, contentType: 'application/json' })); }
await ctx.addInitScript(() => { let a = 0x2f6b1d; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
const t0 = Date.now(); const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
await page.goto(BASE + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 1500000 });
await ev(() => { game.testFreeze = true; }); log('booted');
await page.click('[data-act="new"]', { timeout: 300000 });
await ev(() => {
  const G = game; G.testFreeze = true; G.step(0.2);
  window.T = { talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); } };
  T.talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
}); log('chapter 1');
const shot = async (name, hideHud = true) => {
  await ev((h) => { const hud = document.querySelector('#hud'); if (hud) hud.style.visibility = h ? 'hidden' : ''; game.renderer.render(); }, hideHud);
  await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 300000 }); log('shot', name);
};
const SPOT = await ev(() => {
  const G = game; G.exitRoom({ x: -42, z: -2, a: 0.6 }, true, true); G.step(0.5);
  let best = null;
  for (let r = 3; r <= 14 && !best; r += 1) for (let k = 0; k < 24 && !best; k++) {
    const x = -42 + Math.cos(k / 24 * 6.283) * r, z = -2 + Math.sin(k / 24 * 6.283) * r;
    const near = G.physics.near(x, z).filter((c) => c.enabled !== false && c.type && Math.hypot((c.x ?? x) - x, (c.z ?? z) - z) < 2.6 + (c.r || Math.max(c.hw || 0, c.hd || 0)));
    const ppl = G.npcs.filter((n) => n.pos && Math.hypot(n.pos.x - x, n.pos.z - z) < 4);
    if (!near.length && !ppl.length && Math.abs(G.physics.groundAt(x, z) - G.physics.groundAt(-42, -2)) < 0.3) best = { x: +x.toFixed(2), z: +z.toFixed(2), a: +Math.atan2(-42 - x, -2 - z).toFixed(3) };
  }
  return best || { x: -42, z: -2, a: 0.6 };
});
log('spot', JSON.stringify(SPOT));
const results = {};
for (const look of LOOKSWANT) {
  const D = path.join(OUT, look); fs.mkdirSync(path.join(D, 'poses'), { recursive: true });
  const r = await ev(async ({ look, SPOT }) => {
    const G = game, h = G.hero;
    G.exitRoom({ x: SPOT.x, z: SPOT.z, a: SPOT.a }, true, true);
    G.step(0.5);
    if (look !== 'twinsen') h.swapBody(look); else if (h.body && h.body !== 'twinsen') h.swapBody('twinsen');
    h.pos.set(SPOT.x, G.physics.groundAt(SPOT.x, SPOT.z), SPOT.z); h.angle = SPOT.a; h.onGround = true; h.vy = 0; h.vel?.set?.(0, 0);
    G.camRig.lba && (G.camRig.lba.init = false); G.camRig.snap?.(); G.step(2.0);
    const rd = G.renderer.renderer, info = () => { rd.info.autoReset = false; rd.info.reset(); G.renderer.render(); const o = { calls: rd.info.render.calls, triangles: rd.info.render.triangles }; rd.info.autoReset = true; return o; };
    const withH = info(); h.rig.root.visible = false; const without = info(); h.rig.root.visible = true; info();
    let tris = 0, meshes = 0; const mats = new Set(); h.rig.root.traverse((o) => { if (o.isMesh && o.visible) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; [].concat(o.material).forEach((m) => mats.add(m.uuid)); } });
    return { look, body: h.body, settings: { camera: G.settings.camera, camDist: G.settings.camDist, quality: G.settings.quality }, frame: { withHero: withH, withoutHero: without, heroCalls: withH.calls - without.calls, heroTris: withH.triangles - without.triangles }, rig: { meshes, tris, materials: mats.size }, pos: [h.pos.x, h.pos.y, h.pos.z] };
  }, { look, SPOT });
  log(JSON.stringify(r)); results[look] = r;
  await shot(`${look}/follow-medium`);
  await ev(() => { const G = game, h = G.hero; h.angle += 2.4; G.step(0.06); }); await shot(`${look}/follow-34`);
  await ev(() => { const G = game, h = G.hero; h.angle -= 2.4; G.step(2.0); });
  // dialogue: the nearest outdoor people, walked up to and spoken to (E), the dialogue left open
  const talk = await ev(() => {
    const G = game, h = G.hero;
    const cand = G.npcs.filter((n) => n.present !== false && n.pos && n.def?.id && !n.def.shop && !/pippa|nell|shop|stall/i.test(n.def.id)).map((n) => [n, Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z)]).filter((a) => a[1] < 40).sort((a, b) => (a[0].def.id === 'dot' ? -1 : 0) - (b[0].def.id === 'dot' ? -1 : 0) || a[1] - b[1]);
    for (const [n] of cand.slice(0, 10)) {
      h.pos.set(n.pos.x + Math.sin(n.angle) * 1.4, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.4); h.onGround = true; h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z);
      G.camRig.snap?.(); G.step(1.0); G.input.taps.add('KeyE'); G.step(0.05);
      if (G.state === 'dialog') { G.step(1.2); return { id: n.def.id, char: n.def.char, state: G.state, tried: cand.length }; }
    }
    return { id: null, state: G.state, tried: cand.length };
  });
  log('talk', JSON.stringify(talk)); results[look].talk = talk;
  if (talk.id) await shot(`${look}/dialogue`, false);
  await ev(() => { T.talkAll(); document.querySelectorAll('[data-act="leave"], .shop [data-act="close"]').forEach((b) => b.click()); game.setState?.('play'); game.step(0.3); });
  for (const [nm, yawOff, dist] of [['closeup', 0, 1.9], ['closeup-34', 0.75, 1.9], ['closeup-back', Math.PI * 0.85, 2.3]]) {
    await ev(async ({ yawOff, dist, SPOT }) => {
      const THREE = await import('three'); const G = game, h = G.hero;
      h.pos.set(SPOT.x, G.physics.groundAt(SPOT.x, SPOT.z), SPOT.z); h.angle = SPOT.a; G.step(1.5);
      const head = h.rig.j.head, hp = new THREE.Vector3(); head.getWorldPosition(hp); hp.y += 0.12;
      const cam = G.renderer.camera || G.camera, a = h.angle + yawOff;
      const aim = () => { const wp = new THREE.Vector3(hp.x + Math.sin(a) * dist, hp.y + 0.05, hp.z + Math.cos(a) * dist); if (cam.parent) { cam.parent.updateMatrixWorld(true); cam.parent.worldToLocal(wp); } cam.position.copy(wp); cam.lookAt(hp.x, hp.y - 0.25, hp.z); cam.updateMatrixWorld(true); };
      window.__pre0 ??= G.renderer.pre; G.renderer.pre = () => { window.__pre0?.(); aim(); };
    }, { yawOff, dist, SPOT });
    await shot(`${look}/${nm}`);
  }
  await ev(() => { game.renderer.pre = window.__pre0; });
  if (SKIP_POSES) continue;
  await ev(async () => { const { enterArena } = await import('/src/game/arena.js'); const G = game; enterArena(G); G.enemies.length = 0; for (const e of G._arenaEnemies || []) { e.group && (e.group.visible = false); e.dead = true; } G.step(0.3); });
  const poses = [['idle', 0, 1.0], ['walk', 1.4, 0.55], ['run', 6.5, 0.4], ['turnL', 0, 0.25], ['jump', 0, 0.25], ['fall', 0, 0.3], ['throwQuick', 0, 0.22], ['heavy', 0, 0.3], ['talk', 0, 0.7], ['pickup', 0, 0.45], ['use', 0, 0.5], ['hurt', 0, 0.08], ['doze', 0, 1.5]];
  for (const [pose, speed, t] of poses) {
    for (const [vn, vy] of [['side', Math.PI / 2], ['34', 0.7]]) {
      await ev(async ({ look, pose, speed, t, vy }) => {
        const THREE = await import('three'); const CH = await import('/src/game/characters.js'); const G = game, h = G.hero;
        window.__pr ??= {}; let rig = window.__pr[look];
        if (!rig) { rig = window.__pr[look] = CH.createCharacter(look); (G.renderer.scene || G.scene).add(rig.root); }
        const s0 = G.room.spawn, x = s0.x, z = s0.z - 4, y = h.pos.y;
        h.rig.root.visible = false;
        rig.root.position.set(x, y, z); rig.root.rotation.y = 0; rig.root.visible = true;
        rig.play('idle'); for (let i = 0; i < 40; i++) rig.update(1 / 30, 0);
        if (pose === 'heavy') rig.atk = { s: 0.14, a: 0.12, r: 0.3 };
        rig.play(pose); const n = Math.round(t * 60); for (let i = 0; i < n; i++) rig.update(1 / 60, speed);
        const cam = G.renderer.camera || G.camera, c = new THREE.Vector3(x, y + 1.0, z);
        const aim = () => { rig.root.position.set(x, y, z); rig.root.updateMatrixWorld(true); const wp = new THREE.Vector3(x + Math.sin(vy) * 3.4, y + 1.35, z + Math.cos(vy) * 3.4); if (cam.parent) { cam.parent.updateMatrixWorld(true); cam.parent.worldToLocal(wp); } cam.position.copy(wp); cam.lookAt(c); cam.updateMatrixWorld(true); };
        window.__pre0 ??= G.renderer.pre; G.renderer.pre = () => { window.__pre0?.(); aim(); };
      }, { look, pose, speed, t, vy });
      await shot(`${look}/poses/${pose}-${vn}`);
    }
  }
  await ev((look) => { game.renderer.pre = window.__pre0; const r = window.__pr?.[look]; if (r) r.root.visible = false; game.hero.rig.root.visible = true; }, look);
}
results.errors = errs; results.gpu = GPU; results.at = new Date().toISOString(); results.candidates = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('CAND_')));
fs.writeFileSync(path.join(OUT, 'info.json'), JSON.stringify(results, null, 1));
log('done; errors', errs.length, errs.slice(0, 5));
await browser.close();
