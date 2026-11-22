// ORDER 66.2: do Citadel's townsfolk walk through FLAT-TOWN's new walls or steps? The game runs N simulated seconds
// (testFreeze, G.step 0.1 s) and each person's position is tested against the promenade's wall boxes (inside one below
// its top) and the flight (inside it, off the steps' height by more than 0.4 m).
// usage: node npcwall.mjs <lba3 ROOT> [seconds]
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
const [ROOT, SECS = '240'] = process.argv.slice(2);
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,780', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
const res = await page.evaluate(async (SECS) => {
  const G = game, L = await import('./src/game/citadel-layout.js');
  G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  if (G.room) G.exitRoom({ x: -42, z: 0, a: 0 }, true);
  G.hero.pos.set(-68, G.physics.groundAt(-68, -4), -4);   // (the hero by the flight, so the townsfolk near it are simulated in full)
  const S = L.PROM_STAIR, top = L.PROM_H, hits = {}, near = new Set();
  for (let t = 0; t < SECS; t += 0.1) {
    G.step(0.1);
    for (const n of G.npcs) {
      const p = n.pos; if (!p) continue; const id = n.def?.id || n.id;
      if (p.x < -60 && p.x > -80 && p.z > -32 && p.z < 22) near.add(id);
      for (const W of L.PROM_WALLS) if (p.x > W.x0 && p.x < W.x1 && p.z > W.z0 && p.z < W.z1 && p.y < top - 0.5) (hits[id] ??= []).push(['in wall ' + W.id, +t.toFixed(1), +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]);
      if (p.x > S.xb && p.x < S.xa && p.z > S.zN && p.z < S.zS) {
        const want = 2.3 + (S.xa - p.x) / (S.xa - S.xb) * (top - 2.3);
        if (Math.abs(p.y - want) > 0.4) (hits[id] ??= []).push(['off the steps', +t.toFixed(1), +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +want.toFixed(2)]);
      }
    }
  }
  return { npcs: G.npcs.length, near: [...near], hits: Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, { n: v.length, first: v.slice(0, 3) }])) };
}, +SECS);
console.log(JSON.stringify(res, null, 1));
await browser.close(); server.close?.(); process.exit(0);
