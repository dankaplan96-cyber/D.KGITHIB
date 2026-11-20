// POLISH-SWEEP: close looks at named people (place:id …): a 3/4 view at 2.6 m and a side view at their feet
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [URL0, SAVE, OUT, ...WHO] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const origin = new URL(URL0).origin; const storageState = SAVE === 'new' ? undefined : JSON.parse(fs.readFileSync(SAVE, 'utf8').replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/g, origin));
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,780', '--use-angle=d3d11'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, ...(storageState ? { storageState } : {}) })).newPage();
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click(SAVE === 'new' ? '[data-act="new"]' : '[data-act="continue"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.evaluate(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 120 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } });
const info = [];
for (const w of WHO) {
  const [place, id] = w.split(':');
  const r = await page.evaluate(([place, id]) => { const G = game; if (place === 'citadel') { if (G.room) G.exitRoom({ x: -42, z: 2, a: 0 }, true); } else G.enterRoom(place, null, true, true);
    for (let i = 0; i < 60; i++) { if (G.state !== 'play') G.input.taps.add('KeyE'); G.step(1 / 30); }
    const n = G.npcs.find((q) => (q.def?.id || q.id) === id); if (!n) return { err: 'none' };
    const h = G.hero, a = n.angle ?? 0; h.pos.set(n.pos.x + Math.sin(a) * 6, n.pos.y, n.pos.z + Math.cos(a) * 6); for (let i = 0; i < 5; i++) G.step(1 / 30);
    window.__N = n; const g = G.physics.groundAt(n.pos.x, n.pos.z, n.pos.y + 1.2), gi = G.physics.groundInfo?.(n.pos.x, n.pos.z, n.pos.y + 1.2);
    return { room: G.room?.id || 'citadel', pos: [n.pos.x, n.pos.y, n.pos.z].map((v) => +v.toFixed(2)), ground: g, src: gi?.src || gi?.kind || null, anim: n.rig.anim, pinY: n.pinY ?? null, stop: n.stop?.name || n.stopId || null }; }, [place, id]);
  info.push({ w, ...r });
  if (r.err) continue;
  for (const [tag, dist, h, side] of [['34', 2.6, 1.5, 0.7], ['feet', 2.2, 0.35, 1.57]]) {
    await page.evaluate(([dist, hh, side]) => { const G = game, n = window.__N, a = (n.angle ?? 0) + side, C = G.camera; const P = n.rig.root.getWorldPosition(new (C.position.constructor)());
      C.position.set(P.x + Math.sin(a) * dist, P.y + hh, P.z + Math.cos(a) * dist); C.lookAt(P.x, P.y + (hh < 1 ? 0.2 : 1.0), P.z); C.updateMatrixWorld(); G.renderer.render(); }, [dist, h, side]);
    await page.screenshot({ path: `${OUT}/${place}-${id}-${tag}.jpg`, type: 'jpeg', quality: 80 });
  }
}
fs.writeFileSync(`${OUT}/look.json`, JSON.stringify(info, null, 1)); console.log(JSON.stringify(info, null, 1));
await browser.close(); process.exit(0);
