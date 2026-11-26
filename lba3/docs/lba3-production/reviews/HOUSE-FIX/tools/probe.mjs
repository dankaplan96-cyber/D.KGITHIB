import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
// node probe.mjs <shot> — walk from the reading room east through the divider's doorway at z (PROBE_Z, default 9.6)
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const ev = (f, a) => page.evaluate(f, a);
await page.goto((process.env.GAME_URL || 'http://localhost:8186/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
const r = await ev((pz) => {
  const G = window.game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5);
  G.enterRoom('house', null, true); G.step(0.3); G.settings.controls = 'classic'; G.applySettings();
  const h = G.hero, R = G.room, out = [];
  h.pos.set(R.center.x - 6.0, 0, R.center.z + pz); h.angle = Math.PI / 2; h.vel.set(0, 0); G.step(0.3);
  G.input.keys.add('ArrowUp');
  for (let i = 0; i < 50 && G.room?.id === 'house'; i++) { G.step(0.1); if (i % 3 === 0) out.push([+(h.pos.x - R.center.x).toFixed(2), +h.pos.y.toFixed(2), +(h.pos.z - R.center.z).toFixed(2)]); }
  G.input.keys.delete('ArrowUp'); G.step(1.5);
  G.frame(1 / 30, true);
  return { room: G.room?.id, out };
}, +(process.env.PROBE_Z || 9.6));
console.log(JSON.stringify(r));
await page.screenshot({ path: process.argv[2] || 'probe.jpg', quality: 80 });
await browser.close();
