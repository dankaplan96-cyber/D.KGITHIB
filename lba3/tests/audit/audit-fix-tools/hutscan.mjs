// P57: spots round the station's huts (a grid, four headings; placed as a load puts him, 2.5 s standing, Follow): where
// the camera reads him as hidden, and which (if any) hut stands between; pictures of the first few
// node hutscan.mjs <out-prefix>
import { launch, open, menu, done } from '/dev/shm/t983/tests/lib/boot.mjs';
const out = process.argv[2];
const { browser, page } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: '/dev/shm/t983/tests/lib/camwalk.js' });
await page.evaluate(() => CW.setup());
const spots = [];
for (let x = -39; x <= -19; x += 1.5) for (let z = -64; z <= -52; z += 1.5) for (const a of [Math.PI, Math.PI * 0.75, -Math.PI * 0.75]) spots.push({ x, z, a });
const res = { huts: await page.evaluate(() => { const PH = game.physics, huts = []; for (let x = -40; x <= -18; x += 2) for (let z = -66; z <= -50; z += 2) for (const c of PH.near(x, z)) if (c.type === 'box' && c.hw > 2 && c.hw < 3.6 && c.hd > 1.9 && c.hd < 2.6 && !huts.includes(c)) huts.push(c); window.__huts = huts; return huts.map((c) => [c.x, c.z, c.hw, c.hd, c.top]); }), out: [] };
for (const s of spots) {
  const o = await page.evaluate((s) => {
    const G = game, PH = G.physics, huts = window.__huts;
    const between = (cx, cz, hx, hz) => huts.findIndex((c) => { for (let k = 0.1; k < 0.95; k += 0.05) if (PH._inside(c, cx + (hx - cx) * k, cz + (hz - cz) * k, 0)) return true; return false; });
    const g = PH.groundAt(s.x, s.z, 30); if (!(g > 14 && g < 17.5)) return null;
    CW.place({ x: s.x, z: s.z, a: s.a }); G.step(2.5);
    const c = G.camera.position, h = G.hero.pos, sees = G.camRig._sees(c, h), hut = between(c.x, c.z, h.x, h.z);
    return !sees || hut >= 0 ? { ...s, cam: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), hero: [h.x, h.y, h.z].map((v) => +v.toFixed(2)), sees, hut } : null;
  }, s);
  if (o) res.out.push(o);
}
console.log('huts', JSON.stringify(res.huts));
for (const o of res.out) console.log('SPOT', JSON.stringify(o));
let k = 0;
for (const o of res.out.filter((o) => o.hut >= 0).slice(0, 4)) {
  await page.evaluate((s) => { CW.place(s); game.step(2.5); game.renderer.render(); }, o);
  await page.screenshot({ path: `${out}-${++k}.png`, timeout: 180000 });
}
done();
await browser.close();
