// ORDER 68.1, second pass: Zoé talked to from her far side (the talk camera), Twinsen with the ball (walking, the throw),
// the P121 rocks close, and more minor residents' talks (P116). usage: node v158b.mjs <OUT> <lba3 ROOT>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
const log = (...a) => { console.log(...a); fs.appendFileSync(`${OUT}/log.txt`, a.join(' ') + '\n'); };
let n = 0; const shot = async (tag) => page.screenshot({ path: `${OUT}/${String(n++).padStart(3, '0')}-${tag}.jpg`, type: 'jpeg', quality: 86 });
const ev = (f, a) => page.evaluate(f, a);
const key = async (k, ms = 90) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(900);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play', null, { timeout: 300000 });
// the ball from the cupboard, as a player takes it (the cupboard's spot, E)
await ev(() => { const G = game, c = G.room.searches.find((s) => s.id === 'cupboard'), h = G.hero; h.pos.set(c.x + 0.85, h.pos.y, c.z); h.angle = Math.atan2(c.x - h.pos.x, c.z - h.pos.z); });
await page.waitForTimeout(400); await key('KeyE'); await page.waitForTimeout(800);
for (let i = 0; i < 12 && (await ev(() => game.state)) !== 'play'; i++) { await key('KeyE'); await page.waitForTimeout(500); }
log('ball', await ev(() => game.hero.hasBall));
await ev(() => { const G = game; if (G.room) G.exitRoom({ x: -44.2, z: 76.5, a: Math.PI }, true); G.camRig.setMode?.('follow'); G.camRig.setFollowDistance?.('far'); });
await page.waitForTimeout(2000);
// Zoé from her east side (away from the tap), facing her
const z = await ev(() => { const q = game.npcs.find((r) => r.def.id === 'zoe'); return [q.pos.x, q.pos.z]; });
await ev(({ z }) => { const G = game, h = G.hero, x = z[0] + 1.3, zz = z[1] + 0.2; h.pos.set(x, G.physics.groundAt(x, zz), zz); h.angle = Math.atan2(z[0] - x, z[1] - zz); G.camRig.snap?.(); }, { z });
await page.waitForTimeout(1200);
log('prompt', await ev(() => document.querySelector('#prompt')?.textContent));
await key('KeyE');
for (let i = 0; i < 6; i++) { await page.waitForTimeout(1700); const s = await ev(() => [game.state, document.querySelector('#dialog .name')?.textContent, document.querySelector('#dialog .text')?.textContent]); log('talk', JSON.stringify(s)); await shot(`zoe-talk-${i}`); if (s[0] !== 'dialog') break; await key('KeyE'); }
for (let i = 0; i < 30 && (await ev(() => game.state)) !== 'play'; i++) { await key('KeyE'); await page.waitForTimeout(400); }
// Zoé close: her scalp and tie, front 3/4 and back 3/4
for (const [tag, a, d, hgt] of [['zoe-head-front', 0.6, 1.1, 1.75], ['zoe-head-back', 2.8, 1.1, 1.8], ['zoe-dialogue', 0.3, 2.2, 1.6]]) {
  await ev(({ a, d, hgt }) => { const G = game, q = G.npcs.find((r) => r.def.id === 'zoe'), p = q.pos, C = G.camera, an = q.angle + a; G.testFreeze = true;
    C.position.set(p.x + Math.sin(an) * d, p.y + hgt, p.z + Math.cos(an) * d); C.lookAt(p.x, p.y + 1.55, p.z); C.updateMatrixWorld(); G.renderer.render(); }, { a, d, hgt });
  await shot(tag);
}
await ev(() => { game.testFreeze = false; });
// Twinsen with the ball: walking, the throw (play camera), and his hand close
await ev(() => { const G = game, h = G.hero; h.pos.set(-45.5, G.physics.groundAt(-45.5, 70), 70); h.angle = 0; G.camRig.snap?.(); });
await page.waitForTimeout(1500);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(900); await shot('walk-ball'); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(700);
await key('KeyF', 110); for (const ms of [60, 90, 120, 250]) { await page.waitForTimeout(ms); await shot('throw'); }
await page.waitForTimeout(1500);
await key('KeyF', 110); await page.waitForTimeout(110);
await ev(() => { const G = game, h = G.hero, C = G.camera; G.testFreeze = true; const a = h.angle + 1.2; C.position.set(h.pos.x + Math.sin(a) * 1.6, h.pos.y + 1.4, h.pos.z + Math.cos(a) * 1.6); C.lookAt(h.pos.x, h.pos.y + 1.1, h.pos.z); C.updateMatrixWorld(); G.renderer.render(); });
await shot('throw-close'); await ev(() => { game.testFreeze = false; });
// P121's rocks, close, from the street
for (const [tag, cx, cy, cz, lx, ly, lz] of [['rock-a', -36.0, 1.8, -48.8, -38.4, 0.3, -51.4], ['rock-b', -31.0, 1.8, -45.8, -33.2, 0.6, -48.1]]) {
  await ev(({ lx, lz }) => { const G = game, h = G.hero; h.pos.set(lx + 4, G.physics.groundAt(lx + 4, lz + 4), lz + 4); G.camRig.snap?.(); }, { lx, lz });
  await page.waitForTimeout(1500);
  await ev(({ cx, cy, cz, lx, ly, lz }) => { const G = game, g = (x, z) => G.physics.groundAt(x, z), C = G.camera; G.testFreeze = true; C.position.set(cx, g(cx, cz) + cy, cz); C.lookAt(lx, g(lx, lz) + ly, lz); C.updateMatrixWorld(); G.renderer.render(); }, { cx, cy, cz, lx, ly, lz });
  await shot(tag); await ev(() => { game.testFreeze = false; });
}
// P116: three minor residents in the square, each talked to
const ids = await ev(() => game.npcs.filter((q) => q.present && q.def.minor && !q.def.noTalk && Math.hypot(q.pos.x + 42, q.pos.z + 2) < 22).slice(0, 4).map((q) => [q.def.id, q.def.minor]));
log('minor near the square', JSON.stringify(ids));
for (const [id] of ids) {
  for (let k = 0; k < 3; k++) {
    await ev((id) => { const G = game, q = G.npcs.find((r) => r.def.id === id), h = G.hero, a = q.angle || 0, x = q.pos.x + Math.sin(a) * 1.2, z = q.pos.z + Math.cos(a) * 1.2; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.atan2(q.pos.x - x, q.pos.z - z); G.camRig.snap?.(); }, id);
    await page.waitForTimeout(300); await key('KeyE'); await page.waitForTimeout(800);
    const s = await ev(() => ({ st: game.state, box: document.querySelector('#dialog:not(.hidden) .text')?.textContent || '', floats: [...document.querySelectorAll('#floats > *')].map((e) => e.textContent).filter(Boolean).slice(-2) }));
    if (s.st !== 'play' || s.floats.length) { log('talk', id, JSON.stringify(s)); await shot('remark-' + id); break; }
  }
  for (let i = 0; i < 20 && (await ev(() => game.state)) !== 'play'; i++) { await key('KeyE'); await page.waitForTimeout(400); }
}
await browser.close(); server.close?.(); process.exit(0);
