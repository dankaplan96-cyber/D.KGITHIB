import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
// node capture.mjs <outdir> <tag> [opening|house|all]
// In-game evidence for ARTHUR-12: opening shots (stepped clock) and the house in the game's own camera.
const [outdir, tag, what = 'all'] = process.argv.slice(2);
const URL0 = process.env.GAME_URL || 'http://localhost:8176/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
let bad = 0; page.on('console', (m) => { if (m.type() === 'error') { bad++; console.log('console', m.text()); } });
const ev = (f, a) => page.evaluate(f, a);
const measure = () => ev(() => {
  const THREE = window.__THREE;
  const out = {};
  for (const [id, a] of [['twinsen', game.hero], ...game.npcs.filter((n) => ['zoe', 'arthur'].includes(n.def.id)).map((n) => [n.def.id, n])]) {
    const v = a.rig.j.head.getWorldPosition(a.pos.clone());
    const e = a.rig.j.eyes?.[0]?.getWorldPosition(a.pos.clone());
    out[id] = { headBone: +(v.y - a.pos.y).toFixed(3), eye: e ? +(e.y - a.pos.y).toFixed(3) : null, anim: a.rig.anim, scale: +a.rig.root.scale.y.toFixed(3) };
  }
  return out;
});

if (what === 'all' || what === 'opening') {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
  await ev(() => localStorage.clear());
  await ev(() => { game.testFreeze = true; });
  await page.click('[data-act="new"]', { timeout: 180000 });
  await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
  const runTo = (t) => ev((t) => { for (let i = 0; i < 9000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false); return game.cine?.t; }, t);
  for (const [t, name] of [[30.6, 'op-29s-family'], [32.3, 'op-32s-arthur-close'], [34.2, 'op-34s-over-shoulder'], [49.5, 'op-49s-twinsen-arthur-behind'], [54.3, 'op-54s-all-look-up'], [56.5, 'op-56s-arthur-close2']]) {
    await runTo(t);
    await ev(() => game.frame(1 / 30, true));
    await page.screenshot({ path: `${outdir}/${tag}-${name}.png` });
    console.log(name, JSON.stringify(await measure()));
  }
}
if (what === 'all' || what === 'house') {
  await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
  await ev(() => localStorage.clear());
  await page.click('[data-act="new"]', { timeout: 180000 });
  await ev(() => { const G = window.game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); });
  // 1) Arthur at his boat (his own spot, kneelWork), Twinsen walking up to him: the game's own camera
  await ev(() => {
    const G = game, R = G.rooms.house, s = R.npcSpots.arthur, h = G.hero;
    h.pos.set(s.x - 1.3, 0, s.z - 0.9); h.angle = Math.atan2(s.x - h.pos.x, s.z - h.pos.z); h.vel?.set?.(0, 0);
    for (let i = 0; i < 40; i++) G.frame(0.05, false); G.frame(1 / 30, true);
  });
  await page.screenshot({ path: `${outdir}/${tag}-house-boat-spot.png` });
  console.log('house-boat', JSON.stringify(await measure()));
  // 2) the family standing side by side in the family room (Zoé brought home for the comparison), idle
  await ev(() => {
    const G = game, R = G.rooms.house, c = R.npcSpots.twinsen, h = G.hero;
    const zoe = G.npcs.find((n) => n.def.id === 'zoe'), ar = G.npcs.find((n) => n.def.id === 'arthur');
    zoe.setPresent(true);
    h.pos.set(c.x + 0.2, 0, c.z + 0.6); h.angle = 0.35;
    zoe.placeAt({ x: c.x + 1.5, z: c.z + 0.9, a: 0.35, anim: 'idle' });
    ar.placeAt({ x: c.x + 0.85, z: c.z + 1.45, a: 0.35, anim: 'idle' });
    for (let i = 0; i < 40; i++) G.frame(0.05, false); G.frame(1 / 30, true);
  });
  await page.screenshot({ path: `${outdir}/${tag}-house-family-standing.png` });
  console.log('house-family', JSON.stringify(await measure()));
}
await browser.close();
if (bad) { console.log('BAD', bad); process.exit(3); }
