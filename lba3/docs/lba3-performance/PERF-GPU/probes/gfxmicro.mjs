// PERF-GPU probe runner: node docs/lba3-performance/PERF-GPU/probes/gfxmicro.mjs <page-script.js>
// A new game at 1366x768 (W, H), the script's body run in the page (async; `game` is the game), its JSON printed.
// env: GAME_URL (as the tests), Q (extra query, e.g. &oldedges), SHOT (a jpeg of the page after), OUTDIR (where a
// result's __images { name: dataURL } are written as PNG). SwiftShader: counts and pixels only, never GPU ms.
import { launch, open, menu, done } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const { browser, page } = await launch({ width: +(process.env.W || 1366), height: +(process.env.H || 768) });
page.on('console', (m) => { const t = m.text(); if ((m.type() === 'warning' && /GL_|WebGL|shadow|blit/i.test(t)) || /^PROBE/.test(t)) console.log(m.type(), t.slice(0, 400)); });
await open(page, '?nocine' + (process.env.Q || ''));
await menu(page, 'new');
const code = fs.readFileSync(process.argv[2], 'utf8');
const r = await page.evaluate(`(async () => { ${code} })()`);
if (r && r.__images) { const dir = process.env.OUTDIR || '.'; fs.mkdirSync(dir, { recursive: true }); for (const [k, v] of Object.entries(r.__images)) fs.writeFileSync(dir + '/' + k + '.png', Buffer.from(v.split(',')[1], 'base64')); delete r.__images; }
console.log(JSON.stringify(r, null, 1));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, type: 'jpeg', quality: 90 });
done();
await browser.close();
