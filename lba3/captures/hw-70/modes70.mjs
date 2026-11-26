// ORDER 70.1: v160's behaviour modes with real keys, headed Chrome at 1366x768 (Smart App Control blocks the app here).
//   yard:     a new game, the opening held through (E); the yard's first steps (ball, kettle, inventory, tap) marked done
//             so the Dino-Fly step is the current one; then keys only: F4 Discreet, sneak to the napping Dino-Fly, pet
//             him (E); F2 Athletic, the pipe (run at it, Space); the four modes' captions (F1-F4) in English and Hebrew.
//   depot:    the chapter 2 save (base-03); walked to the project depot, then F4 Discreet near the guard: the "?" and "!"
// usage: node modes70.mjs <OUT> <lba3 ROOT> <yard|depot>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, ROOT, STEP] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const logf = `${OUT}/${STEP}.log`; fs.writeFileSync(logf, '');
const log = (...a) => { const s = a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(logf, s + '\n'); };
const server = await serve(ROOT); const origin = new URL(server.url).origin;
let storageState;
if (STEP === 'depot') { storageState = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/campaign/base-03.save.json'), 'utf8').replaceAll('http://localhost:9201', origin)); for (const o of storageState.origins || []) o.origin = origin; }
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState })).newPage();
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(1200);
let n = 0; const shot = (tag) => page.screenshot({ path: `${OUT}/${STEP}-${String(n++).padStart(2, '0')}-${tag}.jpg`, type: 'jpeg', quality: 86 });
const ev = (f, a) => page.evaluate(f, a);
const key = async (k, ms = 80) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const settle = async () => { for (let i = 0; i < 80; i++) { if ((await ev(() => game.state)) === 'play') return; await key('KeyE'); await page.waitForTimeout(350); } };
const look = () => ev(() => { const G = game, h = G.hero, cd = G.camera.getWorldDirection(new G.camera.position.constructor()), pr = document.querySelector('#prompt');
  return { st: G.state, room: G.room?.id || 'out', x: h.pos.x, z: h.pos.z, fx: cd.x, fz: cd.z, beh: h.behaviour, prompt: pr && pr.offsetParent && !pr.classList.contains('hidden') && getComputedStyle(pr).opacity !== '0' ? pr.textContent : '' }; });
const dirKeys = (s, dx, dz) => { const L = Math.hypot(s.fx, s.fz) || 1, fx = s.fx / L, fz = s.fz / L, rx = -fz, rz = fx, d = Math.hypot(dx, dz) || 1, a = (dx * fx + dz * fz) / d, b = (dx * rx + dz * rz) / d, k = [];
  if (a > 0.38) k.push('KeyW'); else if (a < -0.38) k.push('KeyS'); if (b > 0.38) k.push('KeyD'); else if (b < -0.38) k.push('KeyA'); return k; };
const held = new Set(); const hold = async (ks) => { for (const k of [...held]) if (!ks.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of ks) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
// walk (keys only; the planner gives the way); each > tick: a function called every step (stop when it returns truthy)
const go = async (x, z, tol = 1.0, maxS = 90, each = null) => {
  const t0 = Date.now(); let pts = null, wi = 0, lp = 0, lastPos = null, lastMove = Date.now();
  while ((Date.now() - t0) / 1000 < maxS) {
    const s = await look(); if (s.st !== 'play') { await hold([]); await settle(); continue; }
    if (each) { const r = await each(s); if (r) { await hold([]); return r; } }
    if (Math.hypot(x - s.x, z - s.z) < tol) { await hold([]); return 'there'; }
    if (!lastPos || Math.hypot(s.x - lastPos[0], s.z - lastPos[1]) > 0.3) { lastPos = [s.x, s.z]; lastMove = Date.now(); }
    if (!pts || Date.now() - lp > 5000 || Date.now() - lastMove > 2500) { const p = await ev(({ x, z, tol }) => window.P.plan(x, z, { tol }), { x, z, tol }); pts = (p.ok && p.pts?.length ? p.pts : [[x, z]]).map((q) => Array.isArray(q) ? q : [q.x, q.z]); wi = 0; lp = Date.now(); lastMove = Date.now(); }
    while (wi < pts.length - 1 && Math.hypot(pts[wi][0] - s.x, pts[wi][1] - s.z) < 0.7) wi++;
    await hold(dirKeys(s, pts[wi][0] - s.x, pts[wi][1] - s.z)); await page.waitForTimeout(90);
  }
  await hold([]); return 'timeout';
};
const caption = () => ev(() => { const c = [...document.querySelectorAll('#hud *')].find((e) => /modecap|mode-cap|modeCap/i.test(e.id + ' ' + e.className) && e.offsetParent);
  return c ? c.innerText.replace(/\s+/g, ' ').trim() : null; });

if (STEP === 'yard') {
  await page.click('[data-act="new"]'); await page.waitForTimeout(900); if (await ev(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
  for (let i = 0; i < 60 && (await ev(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await page.waitForTimeout(900); await page.keyboard.up('KeyE'); }
  await page.waitForTimeout(1500);
  await page.addScriptTag({ path: path.join(ROOT, 'tests/lib/player.js') });
  await ev(() => { game.settings.controls = 'modern'; game.applySettings(); });
  // (staged: the steps before the Dino-Fly's marked done — the ball, Zoé's kettle, the inventory, the tap)
  log('staged', await ev(() => { const G = game, f = G.flags; G.hero.hasBall = true; f.pr_kettle = true; f.pr_yard = true; G.tutorial?.done?.add?.('inventory');
    if (G.room) G.exitRoom({ x: -44.2, z: 76.5, a: Math.PI }, true); return { tut2: !!f.pr_tut2 }; }));
  await page.waitForTimeout(2500); await settle();
  const goal = () => ev(() => [document.querySelector('#objective, #goal, .objective')?.innerText?.replace(/\s+/g, ' ').slice(0, 140) || null, game.story?.steps?.current?.() ?? game.openingSteps?.current?.() ?? null]);
  log('goal', await goal()); await shot('yard-dino-goal');
  const D = await ev(() => { const p = game.world?.pets?.find((q) => q.id === 'dinofly'); return p ? { x: p.x, z: p.z, asleep: p.state.asleep() } : null; }); log('dino', D);
  // Discreet (F4), and the caption it shows
  await key('F4'); await page.waitForTimeout(450); log('caption F4', await caption(), (await look()).beh); await shot('caption-discreet-yard');
  // sneak up: stop as the pet prompt shows (or 1.1 m off), watching whether he wakes
  let woke = 0;
  const r = await go(D.x, D.z, 1.1, 120, async (s) => { const a = await ev(() => game.world.pets.find((q) => q.id === 'dinofly').state.asleep()); if (!a) woke++; return /pet/i.test(s.prompt) ? 'prompt' : null; });
  log('sneak', r, { woke, prompt: (await look()).prompt, beh: (await look()).beh }); await shot('dino-reach');
  await key('KeyE'); await page.waitForTimeout(1200); log('pet', await ev(() => ({ pr_dino: !!game.flags.pr_dino, line: document.querySelector('#dialog .text, #say, .say')?.innerText || null })), { prompt: (await look()).prompt }); await shot('dino-pet');
  await settle(); await page.waitForTimeout(800);
  log('goal after', await goal()); await shot('yard-pipe-goal');
  // the barrels' step may stand before the pipe: noted, then marked done to reach the pipe
  log('steps', await ev(() => ({ barrel: !!game.flags.pr_barrel, pipe: game.flags.pr_pipe ?? null })));
  await ev(() => { game.flags.pr_barrel = true; });
  // Athletic (F2), then the pipe: from 3 m west of it, run east and jump (Space) as he reaches it
  await key('F2'); await page.waitForTimeout(450); log('caption F2', await caption(), (await look()).beh); await shot('caption-athletic-yard');
  let rr = await go(-46.5, 69.0, 0.6, 60); log('to the pipe run-up', rr);
  log('pipe before', await ev(() => game.flags.pr_pipe ?? null));
  for (let t = 0; t < 3 && !(await ev(() => game.flags.pr_pipe === 1)); t++) {
    await settle(); await page.waitForTimeout(600); if (t) await go(-46.5, 69.0, 0.6, 30);
    const s = await look(); await hold(dirKeys(s, 1, 0));
    for (let i = 0; i < 40; i++) { const q = await look(); if (q.x > -44.9) { await key('Space', 120); break; } await page.waitForTimeout(40); }
    await page.waitForTimeout(900); await hold([]); const q = await look();
    log('pipe try', t + 1, { x: +q.x.toFixed(2), pr_pipe: await ev(() => game.flags.pr_pipe ?? null) }); await shot(`pipe-try${t + 1}`);
  }
  // the four captions, English then Hebrew (real keys F1-F4, the picture 0.5 s after each)
  for (const lang of (process.env.CAPS === '0' ? [] : ['en', 'he'])) {
    if (lang === 'he') { await ev(() => { game.settings.lang = 'he'; game.applySettings(); }); await page.waitForTimeout(800); }
    for (const [k, b] of [['F1', 'normal'], ['F2', 'athletic'], ['F3', 'aggressive'], ['F4', 'discreet']]) {
      await key(k); await page.waitForTimeout(500); log(`caption ${lang} ${b}`, await caption(), (await look()).beh); await shot(`caption-${lang}-${b}`);
      await page.waitForTimeout(2300); log(`  after 2.8 s`, await caption());
    }
  }
  await ev(() => { game.settings.lang = 'en'; game.applySettings(); });
}

if (STEP === 'depot') {
  await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 });
  await page.waitForTimeout(2000); await settle();
  await page.addScriptTag({ path: path.join(ROOT, 'tests/lib/player.js') });
  await ev(() => { game.settings.controls = 'modern'; game.applySettings(); });
  const marks = () => ev(() => { const E = game.enemies?.list || game.enemies || []; const out = [];
    for (const e of E) { const m = e._nm; if (m?.spr?.visible) out.push({ id: e.id, kind: m.eT > 0 ? '!' : '?', q: +m.q.toFixed(2), st: e.state, d: +Math.hypot(e.pos.x - game.hero.pos.x, e.pos.z - game.hero.pos.z).toFixed(1) }); }
    return out; });
  const guards = () => ev(() => (game.enemies?.list || game.enemies || []).filter((e) => e.alive !== false).map((e) => ({ id: e.id, st: e.state, d: +Math.hypot(e.pos.x - game.hero.pos.x, e.pos.z - game.hero.pos.z).toFixed(1) })));
  // walked in Normal to ~30 m short of the depot's yard, then Discreet
  let r = await go(-47.8, -53.0, 1.5, 120); log('to the depot approach', r, await guards()); await shot('depot-approach');
  await key('F4'); await page.waitForTimeout(500); log('caption', await caption(), (await look()).beh); await shot('depot-discreet');
  let gotQ = false, gotE = false;
  const watch = async () => { const m = await marks(); if (m.length) {
      if (!gotQ && m.some((q) => q.kind === '?')) { gotQ = true; log('"?" up', m); await shot('mark-question'); }
      if (!gotE && m.some((q) => q.kind === '!')) { gotE = true; log('"!" up', m); await shot('mark-exclaim'); return 'seen'; } }
    return null; };
  // sneak on toward the valve, the guard's round between (as a player would creep up)
  const Y = await ev(() => { const D = game.world.depot; return { ...D.yard, valve: D.valve && { x: D.valve.x, z: D.valve.z } }; }); log('depot yard', Y);
  const zone = () => ev(() => game.story?.cur?.depotWatch?.zone?.() ?? null);
  r = await go((Y.x0 + Y.x1) / 2, Y.z0 + 1.5, 1.0, 240, watch); log('into the yard', r, { gotQ, gotE }, await guards());
  if (!gotE) r = await go((Y.x0 + Y.x1) / 2, (Y.z0 + Y.z1) / 2, 1.0, 120, watch); log('sneak', r, { gotQ, gotE }, await guards());
  if (!gotE) { await key('F1'); log('back to Normal (to be seen)'); r = await go((Y.x0 + Y.x1) / 2 + 2, (Y.z0 + Y.z1) / 2 + 2, 1.0, 60, watch); log('normal walk', r, { gotQ, gotE }); }
  await shot('depot-end');
}
log('done');
await browser.close(); server.close?.(); process.exit(0);
