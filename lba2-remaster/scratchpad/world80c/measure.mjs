// scratch: same-view counts and CPU submission (SwiftShader) for WORLD-80's places; node measure.mjs <out.json>
// GAME_URL as the tests; QUALITIES=medium,high
import { launch, open, done } from '../../tests/lib/boot.mjs';
import fs from 'node:fs';
const OUT = process.argv[2];
const { browser, page } = await launch({ width: 1366, height: 768 });
await open(page, '?nocine');
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const VIEWS = [
  { name: 'promenade-to-islet', x: -73.0, z: -6.0, a: -Math.PI / 2 },
  { name: 'bug-street', x: -49.5, z: -9.5, a: -2.0 },
  { name: 'stone-house', x: -30.0, z: -16.5, a: Math.PI },
  { name: 'fort-yard', x: -31.2, z: -61.6, a: Math.PI / 2 },
  { name: 'depot', x: -80.0, z: -66.0, a: Math.PI },
  { name: 'islet-dome', x: -158.5, z: 2.5, a: Math.PI },
];
const res = {};
for (const q of (process.env.QUALITIES || 'medium,high').split(',')) {
  await page.evaluate((q) => { game.settings.quality = q; game.applySettings(); }, q);
  for (const v of VIEWS) {
    const r = await page.evaluate((v) => {
      const G = game, R = G.renderer.renderer;
      G.exitRoom({ x: v.x, z: v.z, a: v.a }, true, true); G.state = 'play'; G.hero.angle = v.a; G.camRig.lba && (G.camRig.lba.init = false);
      const p0 = R.info.programs.length, rows = [];
      let first = true;
      for (let i = 0; i < 225; i++) {
        const dt = 1 / 30, t = i * dt;
        const draw = first || (t >= 1.5 && i % 8 === 0); first = false;
        if (draw) { const gl = R.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
        G.perf.beginFrame(); G._renderMs = 0;
        G.frame(dt, draw);
        if (draw && G._renderMs > 0) rows.push({ ms: G._renderMs, calls: R.info.render.calls, tris: R.info.render.triangles, shadow: G.perf.shadow });
      }
      const s = rows.slice(1), q = (k, p) => { const a = s.map((x) => x[k]).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; };
      return { calls: q('calls', 0.5), callsP95: q('calls', 0.95), shadow: q('shadow', 0.5), tris: q('tris', 0.5), msP50: +q('ms', 0.5).toFixed(1), msP95: +q('ms', 0.95).toFixed(1), frames: s.length, newPrograms: R.info.programs.length - p0, programs: R.info.programs.length };
    }, v);
    res[`${q}/${v.name}`] = r;
    console.log(q, v.name, JSON.stringify(r));
  }
}
const mem = await page.evaluate(() => ({ geometries: game.renderer.renderer.info.memory.geometries, textures: game.renderer.renderer.info.memory.textures, load: game.loadTimes.world }));
res.memory = mem; console.log('memory', JSON.stringify(mem));
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
done();
await browser.close();
