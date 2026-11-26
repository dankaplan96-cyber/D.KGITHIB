// ORDER 77: v173 on the GTX 1050, headed Chrome 1366x768. Steps:
//   paths:  Citadel (a new game, the opening held through): straight-down views over the square and the streets round it
//           (where paving ends in the dirt reads best from above), then the play camera at each signpost and the
//           user's spot by the square's signpost; the grass edges close (the yard, the square's beds).
//   knartas: a chapter 3+ save, Knartas entered: huts, the zeppelin, the rock, from the play camera.
//   sounds: the chapter 2 depot (base-03): every sound the game plays while the watch turns on him, by name.
//   ring:   chapter 7 (base-10): the vent's ring stage, play camera.
// usage: node v173.mjs <OUT> <lba3 ROOT> <step>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, ROOT, STEP] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => { const s = a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(`${OUT}/${STEP}.log`, s + '\n'); };
fs.writeFileSync(`${OUT}/${STEP}.log`, '');
const SAVE = { knartas2: 'base-12', knartas: 'base-12', sounds: 'base-05', rifle: 'base-03', ring: 'base-10-scope' }[STEP];
const server = await serve(ROOT); const origin = new URL(server.url).origin;
let storageState;
if (SAVE) { storageState = JSON.parse(fs.readFileSync(path.join(ROOT, `tests/fixtures/campaign/${SAVE}.save.json`), 'utf8').replaceAll('http://localhost:9201', origin)); for (const o of storageState.origins || []) o.origin = origin; }
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState })).newPage();
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
const ev = (f, a) => page.evaluate(f, a);
const wait = (ms) => page.waitForTimeout(ms);
const key = async (k, ms = 80) => { await page.keyboard.down(k); await wait(ms); await page.keyboard.up(k); };
const settle = async () => { for (let i = 0; i < 60; i++) { if ((await ev(() => game.state)) === 'play') return; await key('KeyE'); await wait(350); } };
let n = 0; const shot = (t) => page.screenshot({ path: `${OUT}/${STEP}-${String(n++).padStart(2, '0')}-${t}.jpg`, type: 'jpeg', quality: 86 });
if (SAVE) { await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 }); await wait(2500); await settle(); }
else { await page.click('[data-act="new"]'); await wait(900); if (await ev(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
  for (let i = 0; i < 60 && (await ev(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await wait(900); await page.keyboard.up('KeyE'); } await wait(1200); }
await ev(() => { const G = game; G.flags.pr_tut2 = false; G.settings.camera = 'follow'; G.settings.camDist = 'far'; G.settings.controls = 'modern'; G.settings.qualityAuto = false; G.settings.quality = 'high'; G.applySettings(); });
const setHero = (x, z, a = 0) => ev(({ x, z, a }) => { const G = game, h = G.hero; if (G.room && G.room.id !== 'citadel') G.exitRoom({ x, z, a }, true, true); h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; G.camRig.snap?.(); }, { x, z, a });
const top = (x, z, hgt, tag) => ev(({ x, z, hgt }) => { const G = game, C = G.camera; G.testFreeze = true; C.position.set(x, G.physics.groundAt(x, z) + hgt, z + 0.01); C.lookAt(x, G.physics.groundAt(x, z), z); C.updateMatrixWorld(); G.renderer.render(); }, { x, z, hgt }).then(() => shot(tag)).then(() => ev(() => { game.testFreeze = false; }));

if (STEP === 'paths') {
  await setHero(-42, -2); await wait(2000);
  const posts = await ev(() => (game.world.cityDress?.items || []).filter((i) => i.name === 'signpost').map((i) => [+i.x.toFixed(1), +i.z.toFixed(1)]));
  log('signposts', posts);
  // from above: the square and round it (45 m up: about 37 m across at the camera's angle)
  for (const [x, z, t] of [[-42, -4, 'square'], [-42, -24, 'square-north'], [-24, -6, 'square-east'], [-60, -2, 'square-west'], [-42, 16, 'square-south'], [-30, 30, 'cross-east'], [-62, 30, 'cross-west']]) {
    await setHero(x, z); await wait(1200); await top(x, z, 42, 'top-' + t);
  }
  // the play camera by each signpost (Twinsen 3 m off it, facing it)
  for (const [i, [x, z]] of posts.slice(0, 6).entries()) { await setHero(x + 3, z + 3, Math.atan2(-3, -3)); await wait(1600); await shot(`post${i}-play`); }
  // the grass edges: the yard's lawn by Twinsen's house, the square's beds, close (Near camera)
  await ev(() => { game.settings.camDist = 'near'; game.applySettings(); });
  for (const [x, z, a, t] of [[-46, 74, Math.PI, 'yard-lawn'], [-52, 70, 2.2, 'yard-west-lawn'], [-46, -14, 0, 'square-bed'], [-38, 8, 3.4, 'square-south-grass']]) { await setHero(x, z, a); await wait(1600); await shot('edge-' + t); }
}
if (STEP === 'knartas') {
  const r = await ev(() => { const G = game; try { G.enterRoom('isle_knartas', null, true, true); } catch (e) { return String(e); } return G.room?.id; }); log('room', r);
  await wait(3500); await settle(); await shot('arrive-play');
  const spots = await ev(() => { const R = game.room, out = []; R.group.updateMatrixWorld(true);
    R.group.traverse((o) => { if (/zeppelin|franco|hut/i.test(o.name || '')) { const p = o.getWorldPosition(new o.position.constructor()); out.push([o.name, +p.x.toFixed(1), +p.z.toFixed(1)]); } });
    return { hero: game.hero.pos.toArray().map((v) => +v.toFixed(1)), named: out.slice(0, 20) }; });
  log('spots', spots);
  const seen = []; for (const [nm, x, z] of spots.named) { if (seen.some(([a, b]) => Math.hypot(a - x, b - z) < 10)) continue; seen.push([x, z]); if (seen.length > 4) break;
    await ev(({ x, z }) => { const G = game, h = G.hero, px = x + 6, pz = z + 6; h.pos.set(px, G.physics.groundAt(px, pz), pz); h.angle = Math.atan2(x - px, z - pz); G.camRig.snap?.(); }, { x, z }); await wait(1800); await shot('near-' + nm.replace(/\W+/g, '_').slice(0, 20)); }
  await ev(() => { game.settings.camDist = 'far'; game.applySettings(); });
  await top(spots.hero[0], spots.hero[2], 60, 'top');
}
if (STEP === 'sounds' || STEP === 'rifle') {
  await ev(() => { const A = game.audio; window.__snd = []; const t0 = performance.now(); for (const fn of ['play', 'held', 'loop', 'start']) { if (typeof A[fn] !== 'function') continue; const orig = A[fn].bind(A); A[fn] = (name, ...r) => { window.__snd.push([((performance.now() - t0) / 1000).toFixed(1), fn + ':' + name]); return orig(name, ...r); }; } });
  if (STEP === 'sounds') await ev(() => { const G = game, D = G.rooms.zeelich.depot, h = G.hero; const x = D.x - 1, z = D.z - 3; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = 0; G.camRig.snap?.(); });
  else log('watch', await ev(() => { const G = game, Y = G.world.depot.yard, h = G.hero; const x = (Y.x0 + Y.x1) / 2, z = Y.z0 + 3; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.PI; G.camRig.snap?.();
    const W = [G.story.cur, ...(G.story.chapters || [])].map((c) => c?.watch).find((w) => w?.goHostile); if (!W) return 'no watch'; W.goHostile(); return W.live().map((e) => e.id + ':' + e.def.kind); }));
  for (let i = 0; i < 20; i++) { await wait(1000); await ev(() => { game.hero.hp = game.hero.maxHp; }); if (i === 6) await shot('depot'); }
  const s = await ev(() => window.__snd); const cnt = {}; for (const [, nme] of s) cnt[nme] = (cnt[nme] || 0) + 1;
  log('sounds played (name: count)', cnt); log('charge sounds in order', s.filter(([, nme]) => /charge|zap|shot|fire|laser|bolt/i.test(nme)).slice(0, 30));
}
if (STEP === 'ring') {
  log('chapter', await ev(() => [game.story.cur?.key, game.room?.id || 'out', game.story.cur?.objective?.()]));
  const R = await ev(() => { const M = game.rooms.hamalayi, V = M?.ventRing; if (!V) return { none: true, keys: Object.keys(M || {}).filter((k) => /vent/i.test(k)) };
    const g = V.group || V.root || V.mesh; let p = null; if (g?.getWorldPosition) { g.updateMatrixWorld(true); p = g.getWorldPosition(new g.position.constructor()).toArray(); } const A = typeof V.at === 'function' ? V.at(0, 0) : V.at; return { at: A && (A.x != null ? [A.x, A.z] : A), x: V.x ?? A?.x ?? p?.[0], z: V.z ?? A?.z ?? p?.[2], y: p?.[1], keys: Object.keys(V).slice(0, 20), live: V.live }; });
  log('ring', R);
  if (R.x != null) {
    for (const [i, [dx, dz]] of [[0, 7], [6, -5], [-7, 0]].entries()) {
      await ev(({ x, z }) => { const G = game; if (G.room?.id !== 'hamalayi') G.enterRoom('hamalayi', { x, z, a: 0 }, true, true); const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); G.camRig.snap?.(); }, { x: R.x + dx, z: R.z + dz });
      await ev(({ x, z }) => { const h = game.hero; h.angle = Math.atan2(x - h.pos.x, z - h.pos.z); game.camRig.snap?.(); }, { x: R.x, z: R.z });
      await wait(2500); await shot('ring-' + i);
    }
    await ev(() => { game.settings.camDist = 'near'; game.applySettings(); }); await wait(1500); await shot('ring-near');
  }
}
if (STEP === 'knartas2') {
  await ev(() => { game.enterRoom('isle_knartas', null, true, true); }); await wait(3500); await settle();
  const h0 = await ev(() => game.hero.pos.toArray());
  // the top view again, then rays through its pixels: the zeppelin (left of the quay) and the huts (right)
  const hits = await ev(async ({ h0, px }) => { const G = game, C = G.camera, T = await import('three'); G.testFreeze = true;
    C.position.set(h0[0], G.physics.groundAt(h0[0], h0[2]) + 60, h0[2] + 0.01); C.lookAt(h0[0], G.physics.groundAt(h0[0], h0[2]), h0[2]); C.updateMatrixWorld(); G.renderer.render();
    const rc = new T.Raycaster(), out = [];
    for (const [x, y] of px) { rc.setFromCamera(new T.Vector2(x / 683 - 1, 1 - y / 384), C); const hit = rc.intersectObjects(G.room.group.children, true).find((q) => q.object.visible); out.push(hit ? [+hit.point.x.toFixed(1), +hit.point.y.toFixed(1), +hit.point.z.toFixed(1)] : null); }
    G.testFreeze = false; return out; }, { h0, px: [[270, 348], [990, 402], [1150, 500], [1100, 330]] }).catch((e) => String(e));
  log('hits', hits);
  if (Array.isArray(hits)) for (const [i, p] of hits.entries()) { if (!p) continue;
    const ok = await ev(({ x, z }) => { const G = game, h = G.hero; for (const [dx, dz] of [[6, 6], [-6, 6], [6, -6], [-6, -6], [9, 0], [0, 9], [-9, 0], [0, -9]]) { const px = x + dx, pz = z + dz, y = G.physics.groundAt(px, pz); if (y > -50) { h.pos.set(px, y, pz); h.angle = Math.atan2(x - px, z - pz); G.camRig.snap?.(); return [px, y, pz]; } } return null; }, { x: p[0], z: p[2] });
    log('stand', i, ok); await wait(1800); await shot(['zeppelin', 'huts-a', 'huts-b', 'huts-c'][i]); }
}
log('done');
await browser.close(); server.close?.(); process.exit(0);
