// An original scene in lba2remake as the game frames it (LBA1's isometric scenes: its own fixed camera), one picture
// per scene. Nothing is stored in the repository: <outdir> must be outside lba3/ (MAP-ORIG.md: /dev/shm/mapcmp/).
// usage: node iso.mjs <lba1|lba2> <outdir> <scene> [scene ...]   (WAIT=ms after load, default 40000)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [game, outdir, ...scenes] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
for (const sc of scenes) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.route(/googletagmanager|google-analytics/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('disclaimerShown', 'yes'); } catch (e) {} });
  await p.goto(`https://lba2remake.net/#game=${game}&scene=${sc}`, { timeout: 180000 });
  await p.waitForTimeout(+(process.env.WAIT || 40000));
  await p.addStyleTag({ content: 'body *:not(canvas){visibility:hidden!important} canvas{visibility:visible!important}' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${outdir}/${game}-scene${sc}.jpg`, type: 'jpeg', quality: 88, timeout: 300000 });
  console.log('shot', game, sc);
  await p.close();
}
await b.close();
