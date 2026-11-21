// node lookcap.mjs <outdir> <look> [candidate.json]  — the game's own character code (lookdev.html, three.js renderer)
// candidate.json replaces assets/poly/<look>.json for this page only (Playwright route); SwiftShader.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const [OUT, LOOK, CAND] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8257/';
const browser = await chromium.launch({ ...(process.env.SHELL_EXE ? { executablePath: process.env.SHELL_EXE } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
if (CAND) await ctx.route(`**/assets/poly/${LOOK}.json`, (r) => r.fulfill({ path: CAND, contentType: 'application/json' }));
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const SH = [
  ['turn', `views=0,1.5708,3.1416&light=outdoor&labels=0&grid=0&props=0&dist=4.2&cy=1.0&gap=1.2`],
  ['turn-grey', `views=0,1.5708,3.1416&light=neutral&mat=grey&labels=0&grid=0&props=0&dist=4.2&cy=1.0&gap=1.2`],
  ['face-front', `yaw=0&light=outdoor&labels=0&props=0&focus=head&fd=1.0&fy=0.13&cpitch=0.05`],
  ['face-34', `yaw=0&light=outdoor&labels=0&props=0&focus=head&fd=1.0&fy=0.13&cyaw=0.7&cpitch=0.05`],
  ['face-side', `yaw=0&light=outdoor&labels=0&props=0&focus=head&fd=1.0&fy=0.13&cyaw=1.5708&cpitch=0.05`],
  ['hand', `yaw=0&light=outdoor&labels=0&props=0&focus=armR.hand&fd=0.5&cyaw=-0.6&cpitch=0.1`],
  ['hand-back', `yaw=0&light=outdoor&labels=0&props=0&focus=armR.hand&fd=0.6&cyaw=2.6&cpitch=0.15`],   // (HANDS-36: from behind, as the Follow camera)
  ['hand-out', `yaw=0&light=outdoor&labels=0&props=0&focus=armR.hand&fd=0.6&cyaw=-1.5708&cpitch=0.05`],   // (HANDS-36: from the outside)
  ['back', `views=3.1416&light=outdoor&labels=0&grid=0&props=0&dist=4.2&cy=1.0`],
  ['walk', `views=0,1.5708&anim=walk&t=0.37&light=outdoor&labels=0&grid=0&props=0&dist=4.2&cy=1.0&gap=1.2`],
  ['run', `views=0,1.5708&anim=run&t=0.21&light=outdoor&labels=0&grid=0&props=0&dist=4.2&cy=1.0&gap=1.2`],
  ['talk', `views=0.6&anim=talk&t=0.5&light=outdoor&labels=0&grid=0&props=0&focus=head&fd=1.4&cyaw=0.5&cpitch=0.05&fy=-0.3`],
  ['game34', `cam=game&yaw=0.62&light=outdoor&labels=0&grid=0&props=0&dist=8.8&cy=1.0`],
];
const only = process.env.ONLY?.split(',');
for (const [n, q] of SH) {
  if (only && !only.includes(n)) continue;
  const qq = process.env.FY ? q.replace(/fy=[-0-9.]+/, "fy=" + process.env.FY) : q;   // (FY: another face height, e.g. an Esmer's face sits low on its tall head)
  await page.goto(`${BASE}lookdev.html?c=${LOOK}&${qq}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.lookdev && window.lookdev.rigs?.length, null, { timeout: 300000 });
  await page.evaluate(() => { for (let i = 0; i < 3; i++) window.lookdev.render(1 / 60); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `${n}.png`) }); console.log('shot', n);
}
const info = await page.evaluate(() => { const g = window.lookdev.rigs[0]; let tris = 0, meshes = 0; g.root.traverse((o) => { if (o.isMesh) { meshes++; const gg = o.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } }); return { tris, meshes }; });
console.log('rig meshes/tris', JSON.stringify(info), 'errors', errs.length, errs.slice(0, 3));
fs.writeFileSync(path.join(OUT, 'info.json'), JSON.stringify({ ...info, errs }, null, 1));
await browser.close();
