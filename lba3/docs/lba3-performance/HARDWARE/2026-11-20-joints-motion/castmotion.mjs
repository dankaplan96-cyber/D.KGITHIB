// ORDER 66.1 (JOINTS-BLENDER 8+): a cast member in motion (walk, run, an idle gesture, talk) from the play camera's
// distance and at dialogue distance. The model is made with the game's own createCharacter and stood on the open quay.
// usage: node castmotion.mjs <OUT> <lba3 ROOT> <look[,look...]>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, WHO = 'arthur'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,780', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.evaluate(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  if (G.room) G.exitRoom({ x: -56, z: -30, a: 0 }, true); G.step(0.5); });
// spot: the wooden quay by Gate 1 (flat, open); the hero stays where he is, out of the picture
const SPOT = { x: 0, z: 30 };
// views: [name, distance, height of the eye, angle off the face, look-at height]
const VIEWS = [['play', 8.0, 4.6, 0.55, 0.8], ['dlg', 2.1, 1.45, 0.6, 1.0], ['dlgside', 2.1, 1.2, 1.57, 0.8]];
// motions: [name, anim, speed, time to settle, frames to keep (s apart)]
const MOTIONS = [['walk', 'walk', 1.3, 1.2, [0, 0.17, 0.34]], ['run', 'run', 3.8, 1.0, [0, 0.09, 0.18]],
  ['gesture', 'idle', 0, 0.6, [0.25, 0.5]], ['talk', 'talk', 0, 0.9, [0, 0.45]], ['kneel', 'kneelWork', 0, 1.5, [0]]].filter((m) => !process.env.M || process.env.M.split(',').includes(m[0]))
  .map((m) => process.env.K ? [m[0], m[1], m[2], m[3], process.env.K.split(',').map(Number)] : m);
if (process.env.VIEWS) VIEWS.splice(0, VIEWS.length, ...JSON.parse(process.env.VIEWS));
for (const look of WHO.split(',')) {
  const info = await page.evaluate(async ({ look, SPOT }) => {
    const G = game, C = await import('./src/game/characters.js');
    const rig = C.createCharacter(look); window.__R = rig;
    const y = G.physics.groundAt(SPOT.x, SPOT.z); rig.root.position.set(SPOT.x, y, SPOT.z); rig.root.rotation.y = 0;
    G.scene.add(rig.root);
    let poly = false, tris = 0; rig.root.traverse((o) => { if (o.isSkinnedMesh) { poly = poly || !!o.geometry.userData?.poly || true; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    return { y, tris: Math.round(tris), polyLook: !!(C.LOOKS[look] && ('poly' in C.LOOKS[look] ? C.LOOKS[look].poly : look)) };
  }, { look, SPOT });
  console.log(look, JSON.stringify(info));
  for (const [mname, anim, speed, settle, keeps] of MOTIONS) {
    // start the motion afresh, run it to its settled state, then step to each kept moment
    await page.evaluate(({ anim, speed, settle, mname }) => { const r = window.__R; r.play('idle'); for (let i = 0; i < 60; i++) r.update(1 / 60, 0);
      r.play(anim); if (mname === 'gesture') r.doGesture('shrug'); for (let t = 0; t < settle; t += 1 / 60) r.update(1 / 60, speed); window.__T = 0; }, { anim, speed, settle, mname });
    let prev = 0;
    for (let k = 0; k < keeps.length; k++) {
      await page.evaluate(({ dt, speed, mname }) => { const r = window.__R; if (mname === 'gesture' && window.__T === 0 && dt === 0) {} for (let t = 0; t < dt - 1e-6; t += 1 / 60) r.update(1 / 60, speed); }, { dt: keeps[k] - prev, speed, mname });
      prev = keeps[k];
      for (const [vname, d, hgt, ang, lookH] of VIEWS) {
        if (vname === 'play' && k > 0) continue;   // one play-camera picture per motion
        await page.evaluate(({ d, hgt, ang, lookH }) => { const G = game, p = window.__R.root.position, a = ang, Cm = G.camera;
          Cm.position.set(p.x + Math.sin(a) * d, p.y + hgt, p.z + Math.cos(a) * d); Cm.lookAt(p.x, p.y + lookH, p.z); Cm.updateMatrixWorld(); G.renderer.render(); }, { d, hgt, ang, lookH });
        await page.screenshot({ path: `${OUT}/${look}-${mname}${k}-${vname}.jpg`, type: 'jpeg', quality: 85 });
      }
    }
  }
  await page.evaluate(() => { game.scene.remove(window.__R.root); });
}
console.log('page errors:', errs.length ? errs.join(' | ').slice(0, 400) : 'none');
await browser.close(); server.close?.(); process.exit(0);
