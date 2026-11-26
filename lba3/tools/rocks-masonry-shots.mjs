// ROCKS-MASONRY before/after pictures (960x540, dpr 1; GAME_URL as the tests): node tools/rocks-masonry-shots.mjs before|after [only,names]
// before = ?rocks=old (the masonry pass off: the rooms as they were), after = the build as it is
import { launch, open, menu } from '../tests/lib/boot.mjs';
import fs from 'node:fs';
const TAG = process.argv[2], ONLY = process.argv[3]?.split(',');
const OUT = new URL('../captures/rocks-masonry', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
// place: room, the spot looked at [x, y, z], how near (a share of the room camera's distance), a turn about it (rad)
const PLACES = [
  ['c3shaft-crate', 'c3shaft', [1807.6, 0.7, -3.9], 0.5, 0],
  ['c3shaft-drum', 'c3shaft', [1792.6, 0.6, 5.0], 0.5, 0],
  ['c3shaft-bore', 'c3shaft', [1800.0, 0.3, -2.9], 0.45, 0],
  ['c3gallery-bridge', 'c3gallery', [2004.6, 1.5, 8.0], 0.45, 1.57],
  ['c3gallery-mirror', 'c3gallery', [2004.6, 1.6, 0.7], 0.5, 1.05],
  ['c3gallery-west-lip', 'c3gallery', [1995.2, 3.0, 0.9], 0.55, 0],
  ['c3gallery-back-wall', 'c3gallery', [2012.6, 3.0, -9.8], 0.5, 0],
  ['c3core-arch', 'c3core', [2209.0, 1.2, -8.6], 0.45, 0],
  ['c3core-duct', 'c3core', [2198.6, 0.8, -11.6], 0.45, 0],
];
const q = TAG === 'before' ? '?nocine&rocks=old' : '?nocine';
const { browser, page } = await launch({ width: 960, height: 540 });
page.setDefaultTimeout(1800000);
await open(page, q);
await menu(page, 'new');
for (const [name, room, at, k, turn] of PLACES) {
  if (ONLY && !ONLY.includes(name)) continue;
  // (the room camera's own angle: its offset from Twinsen at the room's spawn, brought nearer and centred on the spot)
  const url = await page.evaluate(([room, at, k, turn]) => {
    const G = game; G.regions.ensure(room, 'test');
    G.enterRoom(room, null, true, true); G.step(2.0);
    const cam = G.camera, h = G.hero.pos, [x, y, z] = at;
    let ox = cam.position.x - h.x, oy = cam.position.y - h.y, oz = cam.position.z - h.z;
    if (Array.isArray(turn)) { ox = (turn[0] - x); oy = (turn[1] - y); oz = (turn[2] - z); k = 1; turn = 0; }
    if (turn) { const c = Math.cos(turn), s = Math.sin(turn); [ox, oz] = [ox * c - oz * s, ox * s + oz * c]; }
    const hv = G.hero.rig?.root?.visible; if (G.hero.rig?.root) G.hero.rig.root.visible = false;
    cam.position.set(x + ox * k, y + oy * k, z + oz * k); cam.lookAt(x, y, z); cam.updateMatrixWorld();
    G.renderer.render();
    const u = G.renderer.renderer.domElement.toDataURL('image/jpeg', 0.9);
    if (G.hero.rig?.root) G.hero.rig.root.visible = hv;
    return u;
  }, [room, at, k, turn]);
  fs.writeFileSync(`${OUT}/${name}-${TAG}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('shot', name, TAG);
}
await browser.close();
