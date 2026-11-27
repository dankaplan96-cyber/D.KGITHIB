// P150 verify: the square's statue (statue.js, Twinsen's right arm lowered, the ball small and low). Pictures: the play
// camera with Twinsen standing in front of the statue and at its side, and two close views (front, side) aimed at the
// figures. Writes captures/statue-150/*.png; the sheet is made by tools (PIL) from them. Not judged here.
// SERVE=1 node tests/statue-150.mjs
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const OUT = 'captures/statue-150'; fs.mkdirSync(OUT, { recursive: true });
const { check, done } = checker();
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
await ev(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 60 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.flags.intro = true; G.hero.hasBall = true; });
const info = await ev(() => { const S = game.world.statue; return S ? { x: S.x, z: S.z, y: S.y, ry: S.ry, h: S.height } : null; });
check('the statue is on the square', !!info, info);
// the play camera: Twinsen stands d m from the statue on the side `a` (radians from its facing), facing it
const play = async (name, side, d) => {
  const lum = await ev(({ side, d }) => {
    const G = game, S = G.world.statue, h = G.hero, a = S.ry + side;
    const x = S.x + Math.sin(a) * d, z = S.z + Math.cos(a) * d;
    G.exitRoom({ x, z, a: Math.atan2(S.x - x, S.z - z) }, true, true);
    h.angle = Math.atan2(S.x - x, S.z - z); G.camRig.lba && (G.camRig.lba.init = false); G.step(2.0); G.renderer.render();
    return true;
  }, { side, d });
  await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 });
  return lum;
};
// a close view at the figures (the camera set by hand, nothing stepped after it)
const close = async (name, side, d, up) => {
  await ev(({ side, d, up }) => {
    const G = game, S = G.world.statue, a = S.ry + side, c = G.camera;
    const ty = S.y + S.height - 0.9;
    c.position.set(S.x + Math.sin(a) * d, ty + up, S.z + Math.cos(a) * d); c.lookAt(S.x, ty, S.z); c.updateMatrixWorld(true);
    G.renderer.render();
  }, { side, d, up });
  await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 });
};
await play('1-play-front', 0, 7);
await play('2-play-side', Math.PI / 2, 7);
await close('3-close-front', 0, 3.6, 0.3);
await close('4-close-side', Math.PI / 2, 3.6, 0.3);
await close('5-close-front-right', -0.6, 3.6, 0.2);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
