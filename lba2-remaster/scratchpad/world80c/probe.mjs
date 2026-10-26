// scratch: node scratchpad/world80c/probe.mjs <views.json> <outdir> [only,names]
// views: [{ name, x, z, a, t, cam: {x,y,z, tx,ty,tz, fov} , info: true }]
import { launch, open, menu, done } from '../../tests/lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const V = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[4]?.split(',');
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const { browser, page } = await launch({ width: W, height: H });
await open(page, '?nocine');
await menu(page, 'new');
if (process.env.Q) await page.evaluate((q) => { game.settings.quality = q; game.applySettings(); }, process.env.Q);
for (const v of V) {
  if (ONLY && !ONLY.includes(v.name)) continue;
  const r = await page.evaluate((s) => {
    const G = game, h = G.hero;
    G.exitRoom({ x: s.x, z: s.z, a: s.a ?? 0 }, true, true);
    if (s.a != null) h.angle = s.a;
    G.camRig.lba && (G.camRig.lba.init = false); G.step(s.t ?? 1.5);
    if (s.cam) { const c = G.camera; c.position.set(s.cam.x, s.cam.y, s.cam.z); if (s.cam.fov) { c.fov = s.cam.fov; c.updateProjectionMatrix(); } c.lookAt(s.cam.tx, s.cam.ty, s.cam.tz); c.updateMatrixWorld(); }
    G.renderer.render();
    const out = { pos: [h.pos.x, h.pos.y, h.pos.z].map((q) => +q.toFixed(2)), ground: +G.world.H(s.x, s.z).toFixed(2) };
    if (s.info) {
      const P = G.world.physics, cs = [];
      for (const c of P.colliders) { if (!c.enabled) continue; const d = Math.hypot(c.x - s.x, c.z - s.z); if (d < (s.r || 8)) cs.push({ t: c.type, x: +c.x.toFixed(1), z: +c.z.toFixed(1), hw: c.hw && +c.hw.toFixed(2), hd: c.hd && +c.hd.toFixed(2), r: c.r && +c.r.toFixed(2), rot: c.rot && +c.rot.toFixed(2), top: +c.top.toFixed(2) }); }
      out.colliders = cs;
      if (s.grid) { const g = []; for (let dz = -s.grid; dz <= s.grid; dz += s.step || 2) { const row = []; for (let dx = -s.grid; dx <= s.grid; dx += s.step || 2) row.push(+G.world.H(s.x + dx, s.z + dz).toFixed(1)); g.push(row.join(' ')); } out.grid = g; }
    }
    return out;
  }, v);
  if (!v.noshot) await page.screenshot({ path: path.join(OUT, v.name + '.jpg'), type: 'jpeg', quality: 85, timeout: 180000 });
  console.log(v.name, JSON.stringify(r));
}
done();
await browser.close();
