import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
// node quality.mjs <outdir> — HOUSE-FIX: the house through low → medium → high → low and a resize, entered three
// times (out and back in), the hero walked from the door to the reading room and back: errors, room state, shots.
const [outdir] = process.argv.slice(2);
const URL0 = process.env.GAME_URL || 'http://localhost:8186/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let bad = 0; page.on('pageerror', (e) => { bad++; console.log('pageerror', e.message); });
page.on('console', (m) => { if (m.type() === 'error') { bad++; console.log('console', m.text()); } });
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await ev(() => { const G = window.game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); });
for (const q of ['low', 'medium', 'high', 'low']) {
  await ev((q) => { const G = game; G.settings.quality = q; G.applySettings(); G.enterRoom('house', null, true); G.step(0.3); G.frame(1 / 30, true); }, q);
  await page.screenshot({ path: `${outdir}/q-${q}.jpg`, quality: 80 });
}
await page.setViewportSize({ width: 800, height: 450 });
await ev(() => { game.step(0.3); game.frame(1 / 30, true); });
await page.screenshot({ path: `${outdir}/q-resized.jpg`, quality: 80 });
await page.setViewportSize({ width: 1280, height: 720 });
const walk = await ev(() => {
  const G = game, out = [];
  for (let n = 0; n < 3; n++) { G.exitRoom({ x: -60, z: 30 }, true); G.step(0.3); G.enterRoom('house', null, true); G.step(0.3); out.push({ room: G.room.id, kids: G.room.group.children.length, colliders: G.room.colliders.length }); }
  // walk (classic controls, held keys) from the door to the reading-room door and on to the reading chair's rug
  G.settings.controls = 'classic'; G.applySettings();
  const h = G.hero, R = G.room, path = [];
  const go = (x, z, maxT = 12) => { const tx = R.center.x + x, tz = R.center.z + z; let t = 0; while (t < maxT && Math.hypot(h.pos.x - tx, h.pos.z - tz) > 0.35) { h.angle = Math.atan2(tx - h.pos.x, tz - h.pos.z); G.input.keys.add('ArrowUp'); G.step(0.1); t += 0.1; } G.input.keys.delete('ArrowUp'); G.step(0.2); path.push([+(h.pos.x - R.center.x).toFixed(2), +(h.pos.z - R.center.z).toFixed(2)]); return Math.hypot(h.pos.x - tx, h.pos.z - tz) <= 0.5; };
  const ok = [[-1.0, 11.0], [-5.2, 10.95], [-10.8, 9.3], [-9.1, 7.6], [-9.1, 6.4], [-9.0, 2.0], [-5.2, 5.0], [-3.8, 5.0], [1.5, 4.6], [0.9, -0.8], [-2.6, -0.8], [-0.45, -0.9], [1.5, 4.6], [1.2, 9.6]].map(([x, z]) => go(x, z));
  return { reentries: out, ok, path };
});
console.log(JSON.stringify(walk));
await ev(() => game.frame(1 / 30, true));
await page.screenshot({ path: `${outdir}/q-after-walk.jpg`, quality: 80 });
await browser.close();
console.log('errors', bad);
