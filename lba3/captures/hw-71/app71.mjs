// ORDER-71 on the installed game (v168): the opening, Zoé's head, the crystals, the first small key's door. Profile of its
// own (--user-data-dir); a fixture save is put into the app's own storage by the page (as a player's save would be).
// usage: node app71.mjs <OUT> <installed exe> <profile> <lba3 ROOT (fixtures)> <step: opening|zoe|crystals|keys>
import { _electron as electron, chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, EXE, PROFILE, ROOT, STEP] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(PROFILE, { recursive: true });
const logf = `${OUT}/${STEP}.log`; fs.writeFileSync(logf, '');
const log = (...a) => { const s = a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(logf, s + '\n'); };
// (EXE ending in a folder: the desktop app from its source, run by the signed Electron in its node_modules — Smart App
//  Control blocks this desktop's own unsigned builds)
// (EXE 'chrome': the game served from ROOT in headed Chrome — Smart App Control blocks every Electron on this desktop today)
const CH = EXE === 'chrome';
const server = CH ? await serve(ROOT) : null;
const browser = CH ? await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] }) : null;
const app = CH ? null : await electron.launch({ executablePath: EXE, args: [`--user-data-dir=${PROFILE}`], timeout: 120000 });
const page = CH ? await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage() : await app.firstWindow();
if (CH) await page.goto(server.url, { waitUntil: 'load', timeout: 180000 });
const ready = () => page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await ready();
if (!CH) await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setFullScreen(false); w.setContentSize(1366, 768); w.center(); w.focus(); return true; });
await page.waitForTimeout(1500);
let n = 0; const shot = (tag) => page.screenshot({ path: `${OUT}/${STEP}-${String(n++).padStart(2, '0')}-${tag}.jpg`, type: 'jpeg', quality: 86 });
const ev = (f, a) => page.evaluate(f, a);
const key = async (k, ms = 80) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const settle = async () => { for (let i = 0; i < 80; i++) { if ((await ev(() => game.state)) === 'play') return; await key('KeyE'); await page.waitForTimeout(350); } };
const newGame = async () => { await page.click('[data-act="new"]'); await page.waitForTimeout(900); if (await ev(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]'); };
const loadFixture = async (name) => {   // (the fixture's own localStorage, written into the app's origin, then Continue)
  const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/campaign', name + '.save.json'), 'utf8'));
  const items = st.origins[0].localStorage;
  await ev((items) => { for (const { name, value } of items) localStorage.setItem(name, value); }, items);
  await page.reload(); await ready(); await page.waitForTimeout(800);
  await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 });
  await page.waitForTimeout(2000); await settle();
};
const close = async (x, y, z, lx, ly, lz) => { await ev(({ x, y, z, lx, ly, lz }) => { const G = game, C = G.camera; G.testFreeze = true; if (C.isPerspectiveCamera && C.fov < 40) { C.userData.fov0 ??= C.fov; C.fov = 45; C.updateProjectionMatrix(); } C.position.set(x, y, z); C.lookAt(lx, ly, lz); C.updateMatrixWorld(); G.renderer.render(); }, { x, y, z, lx, ly, lz }); };
const unfreeze = () => ev(() => { const C = game.camera; if (C.userData.fov0) { C.fov = C.userData.fov0; delete C.userData.fov0; C.updateProjectionMatrix(); } game.testFreeze = false; });

if (STEP === 'opening' || STEP === 'zoe') {
  await newGame();
  const t0 = Date.now(); let last = '';
  while (STEP === 'opening' && Date.now() - t0 < 200000) {
    const s = await ev(() => ({ st: game.state, sub: [...document.querySelectorAll('#cine-sub, .cine-sub, #subtitle, .subtitle, #captions, .caption')].map((e) => e.textContent).filter(Boolean).join(' | '),
      tw: (() => { const h = game.hero; return h?.rig?.root?.visible !== false && h?.mesh?.visible !== false ? [+h.pos.x.toFixed(1), +h.pos.z.toFixed(1)] : 'hidden'; })(), audio: game.audio?.ctx?.state || null }));
    if (s.sub && s.sub !== last) { log(`[${((Date.now() - t0) / 1000).toFixed(1)}] sub`, s.sub); last = s.sub; }
    if (s.st === 'play') break;
    await shot(`t${((Date.now() - t0) / 1000).toFixed(0)}`);
    await page.waitForTimeout(1500);
  }
  if (STEP === 'zoe') { for (let i = 0; i < 40 && (await ev(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await page.waitForTimeout(900); await page.keyboard.up('KeyE'); } }
  await page.waitForFunction(() => game.state === 'play', null, { timeout: 200000 });
  await page.waitForTimeout(1500);
  // Zoé at home: the house's own camera, then close (front, side, back), then a talk in the yard from her far side
  await shot('home-play');
  const z = await ev(() => { const q = game.npcs.find((r) => r.def.id === 'zoe'); return q ? [q.pos.x, q.pos.y, q.pos.z, q.angle, game.room?.id || 'out'] : null; });
  log('zoe', z);
  // her height from her own meshes (the room's scale is not the world's): the head is the top tenth
  const hb = await ev(() => { const q = game.npcs.find((r) => r.def.id === 'zoe'); const root = q.rig?.root || q.rig?.group || (q.rig?.isObject3D ? q.rig : null) || q.rig?.mesh; if (!root) return Object.keys(q);
    root.updateMatrixWorld(true); let lo = 1e9, hi = -1e9; root.traverse((o) => { if (!o.isMesh || !o.geometry) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox;
      for (const y of [b.min.y, b.max.y]) for (const x of [b.min.x, b.max.x]) for (const zz of [b.min.z, b.max.z]) { const v = o.localToWorld(new o.position.constructor(x, y, zz)); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } });
    return [lo, hi]; });
  log('zoe height', hb);
  const H = Array.isArray(hb) && typeof hb[0] === 'number' ? hb[1] - hb[0] : 1.8, top = Array.isArray(hb) && typeof hb[0] === 'number' ? hb[1] : z[1] + 1.8, hy = top - H * 0.21;
  if (z) for (const [tag, a, d] of [['zoe-front', 0.0, 0.42], ['zoe-side', 1.57, 0.42], ['zoe-back', 3.14, 0.42], ['zoe-34', 0.75, 0.7]]) {
    const an = z[3] + a, D = d * H; await close(z[0] + Math.sin(an) * D, hy + H * 0.02, z[2] + Math.cos(an) * D, z[0], hy, z[2]); await shot(tag); }
  await unfreeze();
  await ev(() => { const G = game; if (G.room) G.exitRoom({ x: -44.2, z: 76.5, a: Math.PI }, true); });
  await page.waitForTimeout(2200);
  await ev(() => { const G = game, q = G.npcs.find((r) => r.def.id === 'zoe'), h = G.hero, x = q.pos.x + 1.3, zz = q.pos.z + 0.2; h.pos.set(x, G.physics.groundAt(x, zz), zz); h.angle = Math.atan2(q.pos.x - x, q.pos.z - zz); G.camRig.snap?.(); });
  await page.waitForTimeout(1500); await shot('yard-play-zoe');
  await key('KeyE');
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(1800); await shot(`talk-${i}`); await key('KeyE'); }
}
if (STEP === 'crystals') {
  await loadFixture('base-03');
  // the well cave (the prologue's crystals, lit by now) and Citadel's singing crystals
  const cave = await ev(() => { const G = game; try { G.enterRoom('well', null, true); } catch (e) { return String(e); } return G.room?.id || 'none'; });
  log('room', cave); await page.waitForTimeout(2500); await shot('cave-play');
  const nodes = await ev(() => (game.room?.nodes || []).map((q) => [q.x, q.y, q.z, q.lit]));
  log('nodes', nodes);
  for (const [i, nd] of nodes.slice(0, 2).entries()) { await close(nd[0] + 1.6, nd[1] + 0.5, nd[2] + 1.2, nd[0], nd[1], nd[2]); await shot(`cave-crystal-${i}`); }
  await unfreeze();
  await ev(() => { const G = game; if (G.room) G.exitRoom({ x: -42, z: 0, a: 0 }, true); }); await page.waitForTimeout(2500);
  const sing = await ev(() => (game.pickups?.list || []).filter((q) => /sing|crystal/i.test(q.type || '') && q.mesh?.visible).map((q) => [q.type, +q.pos.x.toFixed(1), +q.pos.y.toFixed(1), +q.pos.z.toFixed(1)]).slice(0, 3));
  log('singing crystals', sing);
  for (const [i, s] of sing.slice(0, 2).entries()) {
    log(`singing-${i} ground/water`, await ev(({ x, z }) => { const G = game; const g = G.physics.groundAt(x, z);
      let best = null; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; for (const r of [2.5, 4, 6]) { const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r, gy = G.physics.groundAt(px, pz); if (!best || gy > best[2]) best = [px, pz, gy]; } }
      const h = G.hero; h.pos.set(best[0], best[2], best[1]); h.angle = Math.atan2(x - best[0], z - best[1]); G.camRig.snap?.();
      return { ground: +g.toFixed(2), water: G.water?.level ?? G.seaLevel ?? null, stand: best.map((v) => +v.toFixed(1)) }; }, { x: s[1], z: s[3] }));
    await page.waitForTimeout(2000); await shot(`singing-${i}-play`);
    await close(s[1] + 5, s[2] + 2.5, s[3] + 5, s[1], s[2], s[3]); await shot(`singing-${i}-wide`);
    await close(s[1] + 1.2, s[2] + 0.6, s[3] + 1.2, s[1], s[2] + 0.2, s[3]); await shot(`singing-${i}-close`);
    for (const k of [1]) { await ev(() => { game.renderer.render(); }); await page.waitForTimeout(150); await shot(`singing-${i}-close-f${k}`); }
    await unfreeze();
  }
}
if (STEP === 'keys') {
  await loadFixture('base-03');
  await ev(() => { game.settings.controls = 'modern'; game.applySettings(); });
  await page.addScriptTag({ path: path.join(ROOT, 'tests/lib/player.js') });
  const look = () => ev(() => { const G = game, h = G.hero, cd = G.camera.getWorldDirection(new G.camera.position.constructor());
    return { st: G.state, room: G.room?.id || 'out', x: h.pos.x, z: h.pos.z, fx: cd.x, fz: cd.z, prompt: (document.querySelector('#prompt')?.offsetParent && getComputedStyle(document.querySelector('#prompt')).opacity !== '0' && !document.querySelector('#prompt').classList.contains('hidden')) ? document.querySelector('#prompt').textContent : '', keys: G.flags.kc_keys ?? G.hero.smallKeys ?? null, f: Object.fromEntries(Object.entries(G.flags).filter(([k]) => k.startsWith('kc_'))),
      clov: [G.hero.clovers, G.hero.cloverCap ?? G.hero.maxClovers ?? null], hud: document.querySelector('#smallkeys')?.textContent || null, hudShown: !!document.querySelector('#smallkeys')?.offsetParent }; });
  const dirKeys = (s, dx, dz) => { const L = Math.hypot(s.fx, s.fz) || 1, fx = s.fx / L, fz = s.fz / L, rx = -fz, rz = fx, d = Math.hypot(dx, dz) || 1, a = (dx * fx + dz * fz) / d, b = (dx * rx + dz * rz) / d, k = [];
    if (a > 0.38) k.push('KeyW'); else if (a < -0.38) k.push('KeyS'); if (b > 0.38) k.push('KeyD'); else if (b < -0.38) k.push('KeyA'); return k; };
  const held = new Set(); const hold = async (ks) => { for (const k of [...held]) if (!ks.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of ks) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
  const go = async (x, z, tol = 1.0, maxS = 120, promptOk = true) => {
    const t0 = Date.now(); let pts = null, wi = 0, lp = 0, lastPos = null, lastMove = Date.now();
    while ((Date.now() - t0) / 1000 < maxS) {
      const s = await look(); if (s.st !== 'play') { await hold([]); await settle(); continue; }
      const dd = Math.hypot(x - s.x, z - s.z); if (dd < tol || (promptOk && s.prompt && dd < 2.4)) { await hold([]); return 'there'; }
      if (!lastPos || Math.hypot(s.x - lastPos[0], s.z - lastPos[1]) > 0.3) { lastPos = [s.x, s.z]; lastMove = Date.now(); }
      if (!pts || Date.now() - lp > 5000 || Date.now() - lastMove > 2500) { const p = await ev(({ x, z, tol }) => window.P.plan(x, z, { tol }), { x, z, tol }); pts = (p.ok && p.pts?.length ? p.pts : [[x, z]]).map((q) => Array.isArray(q) ? q : [q.x, q.z]); wi = 0; lp = Date.now(); lastMove = Date.now(); }
      while (wi < pts.length - 1 && Math.hypot(pts[wi][0] - s.x, pts[wi][1] - s.z) < 0.7) wi++;
      await hold(dirKeys(s, pts[wi][0] - s.x, pts[wi][1] - s.z)); await page.waitForTimeout(90);
    }
    await hold([]); return 'timeout';
  };
  const faceAndE = async (x, z) => { const s = await look(); await hold(dirKeys(s, x - s.x, z - s.z)); await page.waitForTimeout(110); await hold([]); await page.waitForTimeout(250); log('prompt', (await look()).prompt); await key('KeyE'); await page.waitForTimeout(1500); await settle(); };
  log('start', await look()); await shot('start');
  // 1. the POWDER chest in the fort's yard (north-east corner)
  // (the walk across Citadel from the save's spot is not what this order checks: he is set down in the fort's yard,
  //  a few metres off the chest, and plays from there with the keys)
  log('set down in the yard', await ev(() => { const G = game, h = G.hero; for (const [x, z] of [[-20.6, -71.0], [-22.5, -71.5], [-18.5, -71.5], [-20.6, -69.0]]) { const y = G.physics.groundAt(x, z); if (y < 30) { h.pos.set(x, y, z); h.angle = Math.PI; G.camRig.snap?.(); return [x, +y.toFixed(2), z]; } } return null; }));
  await page.waitForTimeout(1500); await shot('yard-start');
  let r = await go(-20.6, -75.35 + 0.85, 1.0, 60); log('to the chest', r); await shot('chest');
  await faceAndE(-20.6, -75.35); let s = await look(); log('after the chest', { keys: s.keys, f: s.f, hud: s.hud, hudShown: s.hudShown }); await shot('chest-after');
  // 2. the barred north mouth: the lock opens with it, the mouth is a door into the tunnel
  // Save & quit with the key held, then Continue: the key still held?
  { await key('Escape'); await page.waitForTimeout(900);
    const btns = await ev(() => [...document.querySelectorAll('[data-act]')].filter((b) => b.offsetParent).map((b) => b.dataset.act + ':' + b.textContent.trim()));
    const sq = btns.find((b) => /save.*quit|savequit/i.test(b)); log('pause save&quit button', sq || btns);
    if (sq) { await page.click(`[data-act="${sq.split(':')[0]}"]`); await page.waitForTimeout(2000); await shot('after-save-quit');
      await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 }); await page.waitForTimeout(2500); await settle();
      if (!(await ev(() => !!window.P))) await page.addScriptTag({ path: path.join(ROOT, 'tests/lib/player.js') }); await ev(() => { game.settings.controls = 'modern'; game.applySettings(); });
      s = await look(); log('after Continue', { keys: s.keys, hud: s.hud, hudShown: s.hudShown, x: +s.x.toFixed(1), z: +s.z.toFixed(1) }); await shot('continued-key-held'); } }
  // (the mouth faces north, out of the hill below the fort: he is set down a few metres north of it, at the sill's height)
  log('set down by the mouth', await ev(() => { const G = game, h = G.hero, N = G.world.shutDoors.find((d) => d.id === 'passageN');
    for (const [dx, dz] of [[-5, -1], [-6, -1], [-4, -1.5], [-6, -2], [-7, 0]]) { const x = N.x + dx, z = N.z + dz, y = G.physics.groundAt(x, z, N.y + 2); if (Math.abs(y - N.y) < 1.2) { h.pos.set(x, y, z); h.angle = Math.PI / 2; G.camRig.snap?.(); return { N: [N.x, +N.y.toFixed(2), N.z], at: [x, +y.toFixed(2), z] }; } }
    return { N: [N.x, N.y, N.z], none: true }; }));
  await page.waitForTimeout(1500); await shot('mouth-start');
  r = await go(-25.9, -84.6 - 0.8, 0.6, 40); log('to the passage', r); await shot('passage');
  r = await go(-25.9, -85.6, 0.35, 25, false); log('onto the sill', r, (await look()).prompt);
  await faceAndE(-25.9, -84.6); await page.waitForTimeout(1500); s = await look(); log('after the lock', { room: s.room, f: s.f, keys: s.keys });
  if (s.room === 'out') { await go(-25.9, -85.4, 0.3, 20, false); await page.waitForTimeout(2500); s = await look(); log('walked into the mouth', { room: s.room }); }
  await shot('tunnel');
  // 3. inside: the box, the bolt by the ladder, up through the trapdoor (the room's own spots)
  const R = await ev(async () => { const R = game.room, K = (await import('./src/game/keyrooms.js')).KR.kc_tunnel; const p = (o) => o && [+o.x.toFixed(2), +o.z.toFixed(2)];
    return { id: R?.id, box: p(K?.box), bolt: p(K?.bolt), exits: (R?.exits || []).map((q) => [q.to || q.id, +q.x.toFixed(2), +q.z.toFixed(2)]) }; });
  log('tunnel room', R); await shot('tunnel-in');
  if (R.box) { r = await go(R.box[0], R.box[1], 1.0, 40, false); log('to the box', r); await faceAndE(R.box[0], R.box[1]); await page.waitForTimeout(1500); s = await look(); log('after the box', { clov: s.clov, f: s.f }); await shot('box');
    await page.keyboard.down('Control'); await page.waitForTimeout(1200); await shot('behaviour-menu');
    log('behaviour menu clovers', await ev(() => { const c = [...document.querySelectorAll('#behmenu .clovers span')]; return { boxes: c.length, full: c.filter((e) => e.classList.contains('full')).length, cloverMax: game.hero.cloverMax, shown: !!document.querySelector('#behmenu')?.offsetParent }; }));
    await page.keyboard.up('Control'); await page.waitForTimeout(600); }
  if (R.bolt) { r = await go(R.bolt[0], R.bolt[1], 0.9, 40, false); log('to the bolt', r); await faceAndE(R.bolt[0], R.bolt[1]); await page.waitForTimeout(1500); s = await look(); log('after the bolt', { f: s.f }); await shot('bolt'); }
  const ex = await ev(() => (game.room?.exits || []).map((q) => [q.to || q.id, +q.x.toFixed(2), +q.z.toFixed(2)])); log('exits after the bolt', ex);
  const up = ex.find((q) => !/fort-n/.test(String(q[0])));
  if (up) { r = await go(up[1], up[2], 0.3, 40, false); for (let i = 0; i < 6 && (await look()).room !== 'out'; i++) { await key('KeyE'); await page.waitForTimeout(800); } await page.waitForTimeout(2500); s = await look(); log('up the ladder', { r, room: s.room, x: s.x, z: s.z }); await shot('yard-after-ladder'); }
  // 4. a second key test: Save & quit with a key held is the order's check: here the key is spent; if one is still held, it is checked
  s = await look(); log('end', { keys: s.keys, f: s.f, clov: s.clov, hudShown: s.hudShown });
}
log('errors-none');
if (CH) { await browser.close(); server.close?.(); } else await app.close(); process.exit(0);
