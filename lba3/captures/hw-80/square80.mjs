// ORDER 80: the black square after a behaviour switch, looked for without any video encoder: every frame the game
// draws is copied (drawImage of the WebGL canvas into a 2D canvas, in a rAF after the game's own) and scanned on a grid
// for a block of pure black; a frame that has one is saved losslessly (PNG) with the frame before it. The trailers'
// setting: headed Chrome, 1920x1080 drawing buffer (1536x864 at 1.25), High, Modern, Citadel by the square (base-03);
// the same key run as the trailer's modes shot (F2 run + jump, F3 strike, F4 creep, F1 walk) and a turn after it.
// usage: node square80.mjs <OUT> <lba3 ROOT> <runs>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, ROOT, RUNS = '3'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => { const s = a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(`${OUT}/runs.log`, s + '\n'); };
const server = await serve(ROOT); const origin = new URL(server.url).origin;
const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/campaign/base-03.save.json'), 'utf8').replaceAll('http://localhost:9201', origin)); for (const o of st.origins || []) o.origin = origin;
for (let run = 1; run <= +RUNS; run++) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1560,960', '--window-position=0,0', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25, storageState: st })).newPage();
  await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
  const ev = (f, a) => page.evaluate(f, a); const wait = (ms) => page.waitForTimeout(ms);
  const key = async (k, ms = 80) => { await page.keyboard.down(k); await wait(ms); await page.keyboard.up(k); };
  const held = new Set(); const hold = async (ks) => { for (const k of [...held]) if (!ks.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of ks) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
  await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 }); await wait(2500);
  for (let i = 0; i < 40 && (await ev(() => game.state)) !== 'play'; i++) { await key('KeyE'); await wait(300); }
  await ev(() => { const G = game; G.settings.qualityAuto = false; G.settings.quality = 'high'; G.settings.res = 'full'; G.settings.controls = 'modern'; G.settings.camera = 'follow'; G.applySettings(); const h = G.hero; h.pos.set(-49, G.physics.groundAt(-49, 6.5), 6.5); h.angle = -0.6; G.camRig.snap?.(); });
  await wait(2500);
  // the per-frame scan: 96x54 samples; "black" = r+g+b < 8; a frame is flagged when a 4x4-sample block (~80x80 px) is
  // all black and the frame before had no such block there
  await ev(() => { const gl = game.renderer.renderer.domElement, W = gl.width, H = gl.height, C = document.createElement('canvas'); C.width = W; C.height = H; const x = C.getContext('2d', { willReadFrequently: true });
    const S = window.SQ = { n: 0, flagged: [], prev: null, prevURL: null, on: true, W, H, maxBlack: 0 };
    const GX = 96, GY = 54;
    const scan = () => { if (!S.on) return; x.drawImage(gl, 0, 0); const d = x.getImageData(0, 0, W, H).data; const m = new Uint8Array(GX * GY); let nb = 0;
      for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const px = Math.floor((i + 0.5) * W / GX), py = Math.floor((j + 0.5) * H / GY), o = (py * W + px) * 4; if (d[o] + d[o + 1] + d[o + 2] < 8) { m[j * GX + i] = 1; nb++; } }
      S.maxBlack = Math.max(S.maxBlack, nb);
      let block = null; for (let j = 0; j + 4 <= GY && !block; j++) for (let i = 0; i + 4 <= GX && !block; i++) { let all = true, newer = false; for (let b = 0; b < 4 && all; b++) for (let a = 0; a < 4; a++) { const k = (j + b) * GX + i + a; if (!m[k]) { all = false; break; } if (!S.prev || !S.prev[k]) newer = true; } if (all && newer) block = [i, j]; }
      if (block && S.flagged.length < 6) S.flagged.push({ frame: S.n, t: +(performance.now() / 1000).toFixed(2), beh: game.hero.behaviour, block, nb, png: C.toDataURL('image/png'), prevPng: S.prevURL });
      S.prev = m; S.n++; if (S.flagged.length < 6 && S.n % 1 === 0) S.prevURL = null; requestAnimationFrame(scan); };
    requestAnimationFrame(scan); });
  const t0 = Date.now();
  // the trailer's run, twice, then a turn on the spot
  for (let rep = 0; rep < 2; rep++) {
    await key('F2'); await wait(400); await hold(['KeyW']); await wait(1400); await key('Space', 120); await wait(500); await hold([]);
    await key('F3'); await wait(400); await key('Space', 100); await wait(600); await key('Space', 100); await wait(800);
    await key('F4'); await wait(400); await hold(['KeyA']); await wait(1900); await hold([]);
    await key('F1'); await wait(400); await hold(['KeyW']); await wait(1300); await hold([]);
    await hold(['KeyD']); await wait(1200); await hold([]); await wait(600);
  }
  const R = await ev(() => { const S = window.SQ; S.on = false; return { frames: S.n, maxBlackSamples: S.maxBlack, flagged: S.flagged.map((f) => ({ frame: f.frame, beh: f.beh, block: f.block, nb: f.nb })), pngs: S.flagged.map((f) => f.png) }; });
  log(`run ${run}: ${R.frames} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s, buffer ${await ev(() => [game.renderer.renderer.domElement.width, game.renderer.renderer.domElement.height])}, most black samples in one frame ${R.maxBlackSamples} of 5184, flagged`, R.flagged);
  R.pngs.forEach((p, i) => fs.writeFileSync(`${OUT}/run${run}-flag${i}.png`, Buffer.from(p.split(',')[1], 'base64')));
  await browser.close();
}
server.close?.(); process.exit(0);
