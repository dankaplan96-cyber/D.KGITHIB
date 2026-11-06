import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
// node shots.mjs <outdir> <tag> [only]
// HOUSE-FIX audit: Twinsen's house in the game's own camera at several hero spots, plus free views (overhead,
// elevations of each wall) rendered through the game's renderer with the camera moved after the frame.
const [outdir, tag, only] = process.argv.slice(2);
const ROOM = process.env.ROOM || 'house';
const URL0 = process.env.GAME_URL || 'http://localhost:8186/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
let bad = 0; page.on('console', (m) => { if (m.type() === 'error') { bad++; console.log('console', m.text()); } });
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await ev((ROOM) => { const G = window.game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); G.enterRoom(ROOM, null, true); G.step(0.5); }, ROOM);
await ev(() => { document.querySelectorAll('#hud, .hud, #prompt').forEach((e) => (e.style.visibility = 'hidden')); });

// play camera: hero at a house-frame spot (x, z), facing a
const play = [
  ['play-family', -0.45, -0.25, 0],
  ['play-kitchen', -2.3, -2.2, Math.PI],
  ['play-bed', -2.6, 1.6, -1.5],
  ['play-toys', 2.2, 2.6, -2.4],
  ['play-arthur', -9.5, 2.0, 0],
  ['play-arthurN', -9.0, -2.2, Math.PI],
  ['play-reading', -9.6, 9.0, -1.5],
  ['play-zoe', -6.4, 8.6, Math.PI],
  ['play-hall', 0.0, 7.6, 0],
  ['play-door', 2.6, 9.6, Math.PI],
];
// free views: [name, eye(x,y,z), target(x,y,z), fov]
const free = [
  ['top-all', [-4.5, 26, 4.05], [-4.5, 0, 4.0], 42, true],
  ['top-family', [0, 13, 0.3], [0, 0, 0.0], 45, true],
  ['top-arthur', [-9, 12, 1.8], [-9, 0, 1.75], 45, true],
  ['top-hall', [-4.0, 12, 9.3], [-4.0, 0, 9.2], 45, true],
  ['elev-north-family', [0, 1.6, 4.5], [0, 1.4, -3.5], 70],
  ['elev-north-arthur', [-9, 1.6, 5.5], [-9, 1.4, -3.5], 70],
  ['elev-west-arthur', [-6.0, 1.6, 1.8], [-13.5, 1.4, 1.8], 75],
  ['elev-west-reading', [-6.8, 1.6, 9.3], [-13.5, 1.4, 9.3], 75],
  ['elev-west-family', [3.5, 1.6, 0.5], [-4.5, 1.2, 0.5], 70],
  ['elev-east-hall', [-3.0, 1.6, 8.5], [4.5, 1.2, 8.5], 70],
  ['elev-south-toys', [2.5, 1.5, -2.5], [2.5, 0.8, 4.0], 70],
  ['close-stove', [-2.6, 1.9, -0.6], [-3.8, 0.6, -3.0], 60],
  ['close-sink', [-1.6, 1.8, -0.8], [-1.6, 1.4, -3.5], 60],
  ['close-toychest', [1.8, 1.4, 4.2], [3.6, 0.4, 2.6], 55],
  ['close-sideboard', [1.6, 1.8, 7.8], [4.2, 1.0, 6.5], 55],
  ['close-zoe', [-6.4, 1.9, 10.2], [-6.4, 0.9, 7.2], 60],
  ['close-trunk', [1.2, 1.9, 8.0], [3.9, 0.6, 9.9], 60],
  ['close-bench', [-10.6, 1.8, 3.6], [-13.2, 1.0, 2.2], 60],
  ['close-reading', [-10.0, 1.9, 11.0], [-13.0, 0.9, 9.0], 60],
  ['close-bed', [-1.6, 1.9, 3.8], [-3.8, 0.6, 1.4], 60],
  ['close-arthurbed', [-10.2, 1.9, 6.4], [-12.6, 0.6, 4.4], 60],
  ['close-door', [1.2, 2.0, 7.4], [0.6, 0.8, 11.2], 60],
];
if (ROOM === 'cellar') {
  play.length = 0; free.length = 0;
  play.push(['play-c1', 0, 0, 0], ['play-c2', -2.5, -2.5, Math.PI], ['play-c3', 3.5, 1.5, -1.5]);
  free.push(['top-c', [0, 13, 0.1], [0, 0, 0], 50, true], ['elev-c-north', [0, 1.6, 4.4], [0, 1.2, -4.5], 70], ['elev-c-east', [-4.5, 1.6, 0], [5.5, 1.2, 0], 70], ['elev-c-west', [4.5, 1.6, -1.0], [-5.5, 1.2, -1.0], 70]);
}
const want = (n) => !only || only.split(',').some((o) => n.startsWith(o));
for (const [name, x, z, a] of play) {
  if (!want(name)) continue;
  await ev(([x, z, a]) => {
    const G = game, R = G.room, h = G.hero;
    h.pos.set(R.center.x + x, 0, R.center.z + z); h.angle = a; h.vel?.set?.(0, 0);
    for (let i = 0; i < 60; i++) G.frame(0.05, false); G.frame(1 / 30, true);
  }, [x, z, a]);
  await page.screenshot({ path: `${outdir}/${tag}-${name}.jpg`, quality: 85 });
}
for (const [name, e, t, fov, hideHero] of free) {
  if (!want(name)) continue;
  await ev(([e, t, fov, hideHero]) => {
    const G = game, R = G.room, h = G.hero, cam = G.camera;
    h.pos.set(R.spawn.x, 0, R.spawn.z);
    for (let i = 0; i < 10; i++) G.frame(0.05, false);
    G.frame(1 / 30, false);
    const fov0 = cam.fov;
    cam.position.set(R.center.x + e[0], e[1], R.center.z + e[2]);
    if (Math.abs(e[0] - t[0]) < 0.01 && Math.abs(e[2] - t[2]) < 0.2) cam.up.set(0, 0, -1); else cam.up.set(0, 1, 0);
    cam.lookAt(R.center.x + t[0], t[1], R.center.z + t[2]); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const vis = h.rig?.root?.visible; if (hideHero && h.rig?.root) h.rig.root.visible = false;
    G.shadowCull?.update?.(R.group, cam, h.pos);
    G.renderer.render();
    if (h.rig?.root) h.rig.root.visible = vis;
    cam.up.set(0, 1, 0); cam.fov = fov0; cam.updateProjectionMatrix();
  }, [e, t, fov, hideHero]);
  await page.screenshot({ path: `${outdir}/${tag}-${name}.jpg`, quality: 85 });
}
await browser.close();
console.log('bad', bad);
