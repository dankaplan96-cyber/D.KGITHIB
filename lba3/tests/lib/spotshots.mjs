// spot pictures from the play camera: node tests/lib/spotshots.mjs <outdir> <spots.json>  (SERVE=1 or GAME_URL as the tests)
// spots.json: [{ name, x, z, a, room?, y?, t? }] — a: his heading (0 south, π/2 east); room: a region id (else Citadel;
// without x, z: the room's own spawn)
import { launch, open, menu } from './boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SPOTS = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.Q ? '&' + process.env.Q : ''));
await menu(page, 'new');
for (const s of SPOTS) {
  try {
    const where = await ev((s) => { const G = game, h = G.hero;
      if (s.room) G.enterRoom(s.room, s.x == null ? null : { x: s.x, z: s.z, a: s.a ?? 0 }, true, true);
      else G.exitRoom({ x: s.x, z: s.z, a: s.a ?? 0 }, true, true);
      if (s.y != null) h.pos.y = s.y;
      if (s.a != null || s.x != null) h.angle = s.a ?? 0;
      G.camRig.lba && (G.camRig.lba.init = false); G.step(s.t ?? 1.5); G.renderer.render();
      return { room: G.room?.id || 'citadel', x: +h.pos.x.toFixed(2), y: +h.pos.y.toFixed(2), z: +h.pos.z.toFixed(2) }; }, s);
    await page.screenshot({ path: path.join(OUT, s.name + '.png'), timeout: 180000 });
    console.log('shot', s.name, JSON.stringify(where));
  } catch (e) { console.log('FAIL', s.name, e.message.slice(0, 300)); }
}
await browser.close();
