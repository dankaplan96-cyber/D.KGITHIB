// ORDER 73.1: the walls' depth (P132 "e + f") on this GPU, headed Chrome 1366x768: the user's spot (the fort wall in
// shade, DEPTH-LOOK's 'fortwall') and the harbour (walls at a distance), from the play camera (Follow, Far), High and
// Medium; TAG 'now' (the default) or 'before' (?depth=none&wallnormals=1). A new game, the opening held through with E.
// At each place: one still, then Twinsen walks 1.2 s with the camera following (3 frames: shimmer / crawl on the paint).
// usage: node depth73.mjs <OUT> <lba3 ROOT> <now|before>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, TAG] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const Q = TAG === 'before' ? '?depth=none&wallnormals=1&nocine' : '?nocine';
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.goto(server.url + Q, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(1000);
const ev = (f, a) => page.evaluate(f, a);
await page.click('[data-act="new"]'); await page.waitForTimeout(900); if (await ev(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
for (let i = 0; i < 60 && (await ev(() => game.state)) !== 'play'; i++) { await page.keyboard.down('KeyE'); await page.waitForTimeout(900); await page.keyboard.up('KeyE'); }
await ev(() => { const G = game; G.flags.pr_tut2 = false; G.settings.camera = 'follow'; G.settings.camDist = 'far'; G.settings.controls = 'classic'; G.applySettings(); });
const PLACES = [['fortwall', { x: -68.4, z: 1.5, a: -1.5708 }], ['harbour', { x: -107, z: 37, a: -1.2 }]];
for (const q of ['high', 'medium']) {
  await ev((q) => { const G = game; G.settings.qualityAuto = false; G.settings.quality = q; G.applySettings(); G.warmGraphics?.(); }, q);
  for (const [name, s] of PLACES) {
    await ev((s) => { const G = game; G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true); G.hero.angle = s.a; G.camRig.snap?.(); }, s);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${name}-${q}-${TAG}.jpg`, type: 'jpeg', quality: 92 });
    // walking (real keys, Classic: Up walks the way he faces), three frames 0.4 s apart
    await page.keyboard.down('ArrowUp');
    for (let k = 0; k < 3; k++) { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${name}-${q}-${TAG}-walk${k}.jpg`, type: 'jpeg', quality: 92 }); }
    await page.keyboard.up('ArrowUp');
    console.log(name, q, TAG, JSON.stringify(await ev(() => ({ quality: game.settings.quality, room: game.room?.id || 'citadel', hero: game.hero.pos.toArray().map((v) => +v.toFixed(1)) }))));
  }
}
await browser.close(); server.close?.(); process.exit(0);
