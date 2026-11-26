// ORDER 73.4: wave 8 on Citadel with a late save: the Weather Wizard's slate (read it, then Bersimon in Normal) and the
// news on the square's notice board. Real keys for the reading (E); he is set down a few metres off each thing.
// usage: node w8.mjs <OUT> <lba3 ROOT> <save>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, SAVE = 'base-11'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT); const origin = new URL(server.url).origin;
const st = JSON.parse(fs.readFileSync(`${ROOT}/tests/fixtures/campaign/${SAVE}.save.json`, 'utf8').replaceAll('http://localhost:9201', origin)); for (const o of st.origins || []) o.origin = origin;
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState: st })).newPage();
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 });
await page.waitForTimeout(2500);
const ev = (f, a) => page.evaluate(f, a);
const key = async (k, ms = 80) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const settle = async () => { for (let i = 0; i < 60; i++) { if ((await ev(() => game.state)) === 'play') return; await key('KeyE'); await page.waitForTimeout(350); } };
await settle();
let n = 0; const shot = (t) => page.screenshot({ path: `${OUT}/w8-${String(n++).padStart(2, '0')}-${t}.jpg`, type: 'jpeg', quality: 86 });
const lines = async (tag) => { await shot(tag + '-after');
  console.log(tag, 'visible text', JSON.stringify(await ev(() => [...document.querySelectorAll('body *')].filter((e) => e.offsetParent && e.childElementCount === 0 && e.textContent.trim().length > 12 && !/prompt|hud/i.test(e.id)).map((e) => (e.id || e.className) + ': ' + e.textContent.trim().slice(0, 140)).slice(0, 8))));
  return []; };
const linesOld = async (tag) => { const got = []; for (let i = 0; i < 14; i++) { const d = await ev(() => { const D = document.querySelector('#dialog'); return D && D.offsetParent ? [D.querySelector('.name')?.textContent || '', D.querySelector('.text')?.textContent || ''] : null; });
    if (!d) break; await page.waitForTimeout(1600); const d2 = await ev(() => document.querySelector('#dialog .text')?.textContent || ''); got.push(d[0] + ': ' + d2); if (i === 0) await shot(tag); await key('KeyW'); await page.waitForTimeout(500); }
  console.log(tag, JSON.stringify(got)); return got; };
const info = await ev(async () => { const G = game, W8 = (await import('./src/game/wave8world.js')).W8; const S = G.story;
  return { ch: S.cur?.key, room: G.room?.id || 'citadel', slate: W8.slate ? [W8.slate.x, W8.slate.z] : null, boards: (S.stands?.things?.() || []).filter((q) => q.kind === 'cs_board').map((q) => [q.which, +q.x.toFixed(1), +q.z.toFixed(1)]),
    deeds: Object.keys(G.flags).filter((k) => /^w8/.test(k)).slice(0, 20) }; });
console.log('info', JSON.stringify(info));
await ev(() => { game.settings.controls = 'classic'; game.applySettings(); });
await key('F1'); await page.waitForTimeout(300);
// the slate: set down 2.5 m before it, facing it; E
const face = (x, z, d) => ev(({ x, z, d }) => { const G = game, h = G.hero; if (G.room) G.exitRoom({ x, z: z + d, a: Math.PI }, true, true); const px = x, pz = z + d; h.pos.set(px, G.physics.groundAt(px, pz), pz); h.angle = Math.atan2(x - px, z - pz); G.camRig.snap?.(); }, { x, z, d });
if (info.slate) {
  await face(info.slate[0], info.slate[1], 1.0); await page.waitForTimeout(1500);
  console.log('prompt at slate', await ev(() => document.querySelector('#prompt')?.textContent)); await shot('slate');
  await key('KeyW'); await page.waitForTimeout(900); await lines('slate-read');
}
// the square's notice board
for (let i = 0; i < 12 && (await ev(() => game.state)) !== 'play'; i++) { await page.waitForTimeout(1500); await key('KeyW'); }
const B = info.boards.find((q) => q[0] === 'square') || info.boards[0];
if (B) { await face(B[1], B[2], 1.3); await page.waitForTimeout(1500); console.log('prompt at board', await ev(() => document.querySelector('#prompt')?.textContent));
  await key('KeyW'); await page.waitForTimeout(2500); await lines('board-read');
  for (let i = 0; i < 5 && (await ev(() => game.state)) !== 'play'; i++) { await key('KeyW'); await page.waitForTimeout(2500); await lines('board-next' + i); } }
await browser.close(); server.close?.(); process.exit(0);
