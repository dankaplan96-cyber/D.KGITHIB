// ORDER 68.1: v158 on the real GPU, looked at (no timings). Headed Chrome (d3d11), 1366×768 by default (W×H args).
// The opening (the notebook, default) watched whole from New Game, a frame every 1.5 s, with the page's audio state;
// then the house and the yard (Twinsen walking, the ball thrown, a talk with Zoé at the talk camera), Citadel's rocks
// (P121), the shop's step (P113), lawn edges (P112), a minor resident's overhead remark (P116).
// usage: node v158.mjs <OUT> <lba3 ROOT> [W] [H] [only: opening|world]
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, W = '1366', H = '768', ONLY = ''] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: [`--window-size=${+W + 24},${+H + 90}`, '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: +W, height: +H } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
const log = (...a) => { console.log(...a); fs.appendFileSync(`${OUT}/log.txt`, a.join(' ') + '\n'); };
let n = 0; const shot = async (tag) => page.screenshot({ path: `${OUT}/${String(n++).padStart(3, '0')}-${tag}.jpg`, type: 'jpeg', quality: 86 });
await page.goto(server.url + (ONLY === 'world' ? '?nocine' : ''), { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(900);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
if (ONLY !== 'world') {
  // the opening, whole: a frame every 1.5 s until play
  const t0 = Date.now(); let last = '';
  while (Date.now() - t0 < 240000) {
    const s = await page.evaluate(() => { const G = game, a = G.audio?.ctx || G.audio?.context; return { st: G.state, cap: document.querySelector('#cine-caption, .caption, #caption')?.textContent || '', audio: a ? a.state : 'none' }; });
    if (s.st !== last) { log('state', s.st, 'audio', s.audio, ((Date.now() - t0) / 1000).toFixed(1) + 's'); last = s.st; }
    if (s.st === 'play') break;
    await shot(`opening-${((Date.now() - t0) / 1000).toFixed(0)}s`);
    await page.waitForTimeout(1500);
  }
  log('opening ends at', ((Date.now() - t0) / 1000).toFixed(1), 's');
  if (ONLY === 'opening') { log('errors', errs.join(' | ').slice(0, 400) || 'none'); await browser.close(); server.close?.(); process.exit(0); }
}
await page.waitForFunction(() => game.state === 'play', null, { timeout: 300000 });
await page.waitForTimeout(1500);
const ev = (f, a) => page.evaluate(f, a);
const put = (x, z, a) => ev(({ x, z, a }) => { const G = game, h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; G.camRig.snap?.(); }, { x, z, a });
// the house: Twinsen walking in it (the room's own camera)
await shot('house-start');
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(700); await shot('house-walk'); await page.keyboard.up('ArrowUp');
// the yard: out by the game's own door, Zoé, a talk at the talk camera
await ev(() => { const G = game; if (G.room) G.exitRoom({ x: -44.2, z: 76.5, a: Math.PI }, true); G.flags.pr_tut2 = false; G.camRig.setMode?.('follow'); G.camRig.setFollowDistance?.('far'); });
await page.waitForTimeout(2000);
const zoe = await ev(() => { const z = game.npcs.find((q) => q.def.id === 'zoe'); return z ? [z.pos.x, z.pos.z, z.angle] : null; });
log('zoe at', JSON.stringify(zoe));
if (zoe) {
  await put(zoe[0] + Math.sin(zoe[2]) * 1.5, zoe[1] + Math.cos(zoe[2]) * 1.5, zoe[2] + Math.PI);
  await page.waitForTimeout(1500); await shot('yard-play-zoe');
  await page.keyboard.down('KeyE'); await page.waitForTimeout(90); await page.keyboard.up('KeyE');
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(1600); await shot(`talk-zoe-${i}`); await page.keyboard.down('KeyE'); await page.waitForTimeout(90); await page.keyboard.up('KeyE'); }
  for (let i = 0; i < 30 && (await ev(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await page.waitForTimeout(90); await page.keyboard.up('KeyE'); await page.waitForTimeout(400); }
}
// Twinsen walking and throwing in the yard (play camera), and closer
await put(-45.5, 70, 0); await page.waitForTimeout(1500);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(900); await shot('yard-walk'); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(600);
await page.keyboard.down('KeyF'); await page.waitForTimeout(100); await page.keyboard.up('KeyF');
for (const ms of [80, 120, 200]) { await page.waitForTimeout(ms); await shot('throw'); }
await page.waitForTimeout(1200);
await ev(() => { const G = game, h = G.hero, C = G.camera; G.testFreeze = true; C.position.set(h.pos.x + 1.6, h.pos.y + 1.5, h.pos.z + 1.6); C.lookAt(h.pos.x, h.pos.y + 1.0, h.pos.z); C.updateMatrixWorld(); G.renderer.render(); });
await shot('twinsen-close'); await ev(() => { game.testFreeze = false; });
// Citadel: the rocks (P121), the shop's step (P113), lawn edges (P112), the play camera
for (const [tag, x, z, a] of [['rocks-1', -36.5, -49.5, -2.3], ['rocks-2', -31.5, -46.5, -2.4], ['shop-step', -33.75, 1.5, Math.PI], ['lawn-edge-west', -53, -9, 3.14], ['lawn-edge-south', -45, 24, 3.14]]) {
  await put(x, z, a); await page.waitForTimeout(2200); await shot(tag);
}
// a minor resident's overhead remark (P116): the nearest walker of the square's who is minor
const who = await ev(() => { const G = game, h = G.hero; h.pos.set(-42, G.physics.groundAt(-42, 6), 6);
  const c = G.npcs.filter((q) => q.present && q.def.minor && !q.def.noTalk).map((q) => [q, Math.hypot(q.pos.x + 42, q.pos.z - 6)]).sort((a, b) => a[1] - b[1])[0];
  if (!c) return null; const q = c[0]; return [q.def.id, q.def.minor, q.pos.x, q.pos.z]; });
log('minor resident', JSON.stringify(who));
if (who) {
  for (let k = 0; k < 6; k++) {
    const p = await ev((id) => { const q = game.npcs.find((r) => r.def.id === id); return [q.pos.x, q.pos.z]; }, who[0]);
    await ev(({ p }) => { const G = game, h = G.hero; const ang = Math.atan2(p[0] - (p[0] + 1.2), p[1] - (p[1] + 0.4)); h.pos.set(p[0] + 1.2, G.physics.groundAt(p[0] + 1.2, p[1] + 0.4), p[1] + 0.4); h.angle = ang; G.camRig.snap?.(); }, { p });
    await page.waitForTimeout(250); await page.keyboard.down('KeyE'); await page.waitForTimeout(90); await page.keyboard.up('KeyE');
    await page.waitForTimeout(700);
    const b = await ev(() => ({ st: game.state, bubble: [...document.querySelectorAll('.remark, .overhead, .bubble, .say-over')].map((e) => e.textContent).join(' | ') }));
    if (b.bubble || b.st !== 'play') { log('remark', JSON.stringify(b)); await shot('remark'); break; }
  }
}
log('errors', errs.join(' | ').slice(0, 400) || 'none');
await browser.close(); server.close?.(); process.exit(0);
