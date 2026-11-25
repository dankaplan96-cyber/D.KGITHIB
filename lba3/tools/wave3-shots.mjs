// EXPANSION WAVE 3 (docs/lba-maturity/WAVE3.md): before/after pictures from the play camera (Follow, Far, 1280×720) of the
// places H-6, H-7 and H-8 add to (Zeelich's west end post and the depot's store, the goats' ledges by Lhar's icefall and
// the rope at the top, the isles' crossings, the gorge's ice arch), then one sheet of them all.
//   SERVE=1 TAG=after node tools/wave3-shots.mjs                       → captures/wave3/after-*.png
//   SERVE=1 TAG=before BEFORE_DEPTH=<story/depth.js from before the wave> node tools/wave3-shots.mjs
//   python3 tools/wave3-sheet.py                                         → captures/wave3/wave3-sheet.jpg
// (before: the page is given the old depth.js, which builds none of wave 3: the places as they were. An `after` view with a
//  state (lit, open, tied) shows the state its flags set; -NOTPLAY: a fixed camera, not the play camera. Automated runtime
//  only, SwiftShader)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, open, menu, URL0 } from '../tests/lib/boot.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TAG = process.env.TAG || 'after', OUT = path.join(ROOT, 'captures/wave3');
fs.mkdirSync(OUT, { recursive: true });
const { browser, context, page } = await launch({ width: 1280, height: 720 });
if (TAG === 'before') {
  const src = fs.readFileSync(process.env.BEFORE_DEPTH, 'utf8');
  await context.route(new URL('src/game/story/depth.js', URL0).href, (r) => r.fulfill({ status: 200, body: src, headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } }));
}
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { const G = game; P.settle(); window.BASE = JSON.parse(JSON.stringify(G.flags)); });
// [name, chapter, flags, area, hero x, z, facing x, z, (only after)]
const VIEWS = [
  ['h6-westpost', 'council', { c7_done: true }, 'zeelich', 2359.8, -3.4, 2357.6, -7.2],
  ['h6-westpost-lit', 'council', { c7_done: true, dx_heat_open: true }, 'zeelich', 2359.8, -3.4, 2357.6, -7.2, true],
  ['h6-westpost-NOTPLAY', 'council', { c7_done: true, dx_heat_open: true }, 'zeelich', 2361.5, -2.0, 2357.6, -7.2, false, [2360.6, 8.6, -2.6, 2358.0, 7.0, -6.8]],
  ['h6-store', 'home', { c7_done: true, ep_free: true }, 'zeelich', 2419.6, 16.4, 2421.2, 21.3],
  ['h6-store-open', 'home', { c7_done: true, ep_free: true, dx_store_open: true }, 'zeelich', 2419.6, 16.4, 2421.2, 21.3, true],
  ['h7-ledges-NOTPLAY', 'evacuation', { c7_done: true }, 'hamalayi', 4277.0, -15.5, 4282.0, -23.5, false, [4281.5, 17.5, -11.0, 4282.0, 16.0, -24.0]],
  ['h7-rope-NOTPLAY', 'evacuation', { c7_done: true, dx_goatpath: true, dx_goat_tied: true }, 'hamalayi', 4277.0, -15.5, 4282.0, -23.5, true, [4281.5, 17.5, -11.0, 4282.0, 18.0, -24.0]],
  ['h8-yard-NOTPLAY', 'council', { c7_done: true }, 'isle_otringal', 1915.2, 1844.6, 1927.5, 1844.0, false, [1921.0, 15.0, 1830.0, 1928.0, 3.5, 1844.5]],
  ['h8-quay-NOTPLAY', 'council', { c7_done: true }, 'isle_otringal', 1881.0, 1851.2, 1867.5, 1852.0, false, [1874.0, 14.0, 1838.0, 1866.5, 3.5, 1852.5]],
  ['h8-honey-NOTPLAY', 'council', { c7_done: true }, 'isle_mosquibee', 2570.0, 1828.4, 2556.97, 1828.38, false, [2563.0, 19.0, 1814.0, 2556.0, 9.5, 1827.0]],
  ['h8-gorge-NOTPLAY', 'evacuation', { c7_done: true, c6_bridge: true }, 'hamalayi', 4294.0, 33.5, 4284.5, 41.0, false, [4295.0, 11.0, 30.0, 4285.0, 4.0, 41.0]],
];
for (const [name, key, flags, area, x, z, fx, fz, afterOnly, cam] of VIEWS) {
  if (afterOnly && TAG === 'before') continue;
  const where = await ev(([key, flags, area, x, z, fx, fz, cam]) => {
    const G = game, h = G.hero, f = G.flags;
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, c1_water: true, c1_done: true, chapterKey: key }, flags);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); h.hasBall = true;
    G.story.applyFlags(); G.regions.ensure(area, 'shots'); G.enterRoom(area, { x, z, a: 0 }, true); P.settle(); G.story.refreshCast(); G.story.depth?.applyWorld?.();
    // (the pictures are of places: an enemy a staged chapter left standing — the depot's chapter-3 guard — is taken out of the view)
    for (const e of G.enemies) { e.present = false; if (e.mesh) e.mesh.visible = false; if (e.rig?.root) e.rig.root.visible = false; }
    h.hp = h.maxHp;
    h.pos.set(x, G.physics.groundAt(x, z, 60), z); h.angle = Math.atan2(fx - x, fz - z); h.onGround = true; h.vy = 0;
    if (G.camRig.lba) G.camRig.lba.init = false;
    G.camRig.snap?.();
    for (let i = 0; i < 40; i++) G.step(1 / 30);
    // (NOTPLAY: a fixed camera for a close look at what was added, labelled so in the file name)
    if (cam) { const c = G.camera; c.position.set(cam[0], cam[1], cam[2]); c.lookAt(cam[3], cam[4], cam[5]); c.updateMatrixWorld(); }
    G.renderer.render(); return G.room?.id;
  }, [key, flags, area, x, z, fx, fz, cam]);
  const file = path.join(OUT, `${TAG}-${name}.png`);
  await page.screenshot({ path: file, timeout: 180000 });
  console.log('shot', where, file);
}
await browser.close();
