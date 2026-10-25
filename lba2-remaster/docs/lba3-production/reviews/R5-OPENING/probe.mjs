// R5-OPENING probe: steps a new game's opening on its own clock (1/30 s) to each requested time and renders the frame
// from the scene's own camera and/or from test cameras (house-local metres), e.g. a close side view of the tap to
// check where Zoé's fingers are. The scene is not changed: the test camera replaces the scene's camera for one frame.
//   node probe.mjs <outdir> <width> <height> <spec> [<spec> ...]       GAME_URL (default http://localhost:8181/)
//   spec  t                          the scene's own camera at t
//         t@name:x,y,z:lx,ly,lz:fov  a test camera at t (house-local position and look point; `w` before x: world)
// Saves <outdir>/p_<t>_<name>.jpg in the order given (the times must not go backwards).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, W, H, ...SPECS] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const URL0 = process.env.GAME_URL || 'http://localhost:8181/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
await ev(() => { localStorage.clear(); game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 180000 });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
for (const spec of SPECS) {
  const [ts, cam] = spec.split('@');
  const t = +ts;
  await ev((t) => { for (let i = 0; i < 9000 && game.cine && game.cine.t + 1 / 30 < t - 1e-6; i++) game.frame(1 / 30, false); }, t);
  const name = await ev(([cam]) => {
    const G = game, c = G.cine, R = G.rooms.house;
    if (!cam) { G.frame(1 / 30, true); return 'cine'; }
    const [nm, p, l, fov] = cam.split(':');
    const world = p.startsWith('w');
    const P = p.replace('w', '').split(',').map(Number), Lk = l.replace('w', '').split(',').map(Number);
    const ox = world ? 0 : R.center.x, oz = world ? 0 : R.center.z;
    const own = c.camera;
    c.camera = function () {
      const cm = G.camera; cm.position.set(P[0] + ox, P[1], P[2] + oz); cm.lookAt(Lk[0] + ox, Lk[1], Lk[2] + oz);
      cm.fov = +fov || 40; cm.updateProjectionMatrix(); G.camRig.look.set(Lk[0] + ox, Lk[1], Lk[2] + oz);
    };
    // (a test camera may stand where the hidden walls are: draw everything)
    G.frame(1 / 30, true);
    c.camera = own;
    return nm;
  }, [cam]);
  const tt = await ev(() => game.cine?.t ?? 0);
  await page.screenshot({ path: path.join(OUT, `p_${tt.toFixed(2).padStart(6, '0')}_${name}.jpg`), type: 'jpeg', quality: 88 });
  console.log('shot', tt.toFixed(2), name);
}
console.log(errs.length ? errs.slice(0, 8).join('\n') : 'no errors');
await browser.close();
