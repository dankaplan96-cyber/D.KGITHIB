// node cap.mjs <outdir> <tag> [only,names]   (GAME_URL=http://127.0.0.1:8183/)
// arrival: enterRoom(isle, null) + 2 s; landmark: hero at R.landmark facing look + 2 s; story: zeelich spots.
// renderer.info of one composed frame after two warm frames; screenshot 1280x720.
import { launch, open, menu } from '../../../../../tests/lib/boot.mjs';
import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2], TAG = process.argv[3], ONLY = process.argv[4]?.split(',');
fs.mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
const ISLES = await ev(() => Object.values(game.rooms).filter((R) => R.isle).map((R) => R.isle));
const spots = [];
for (const n of ISLES) { spots.push({ name: n + '-arrival', room: 'isle_' + n }); spots.push({ name: n + '-landmark', room: 'isle_' + n, lm: true }); }
// story island (offsets from R.street): the north street, the plaza looking north, the east end
spots.push({ name: 'story-street', room: 'zeelich', st: 'street', dx: -4, dz: 6, a: Math.PI * 0.85 });
spots.push({ name: 'story-plaza', room: 'zeelich', st: 'street', dx: -2, dz: -2, a: 0.2 + Math.PI });
spots.push({ name: 'story-east', room: 'zeelich', st: 'street', dx: 18, dz: 0, a: -Math.PI / 2 - 0.5 });
const rows = [];
for (const s of spots) {
  if (ONLY && !ONLY.some((o) => s.name.startsWith(o))) continue;
  const r = await ev((s) => {
    const G = game, h = G.hero;
    const R = G.rooms[s.room];
    let at = null;
    if (s.lm && R.landmark) { const L = R.landmark; at = { x: L.x, z: L.z, a: Math.atan2(L.look.x - L.x, L.look.z - L.z) }; if (Math.hypot(L.look.x - L.x, L.look.z - L.z) < 0.5) at.a = Math.atan2(L.x - R.spawn.x, L.z - R.spawn.z); }
    if (s.st) { const p = R[s.st]; at = { x: p.x + s.dx, z: p.z + s.dz, a: s.a }; }
    G.enterRoom(s.room, at, true, true);
    if (at) h.angle = at.a;
    G.camRig.lba && (G.camRig.lba.init = false);
    G.step(2.0);
    return { views: R.views || null, room: G.room?.id, x: +h.pos.x.toFixed(2), y: +h.pos.y.toFixed(2), z: +h.pos.z.toFixed(2), a: +h.angle.toFixed(3) };
  }, s);
  const info = await ev(() => { const G = game, rr = G.renderer.renderer; rr.info.autoReset = false; G.renderer.render(); G.renderer.render(); rr.info.reset(); G.renderer.render(); const i = rr.info; return { calls: i.render.calls, tris: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures }; });
  await page.screenshot({ path: path.join(OUT, `${s.name}-${TAG}.jpg`), type: 'jpeg', quality: 82, timeout: 180000 });
  rows.push({ spot: s.name, ...r, ...info });
  console.log(JSON.stringify(rows.at(-1)));
}
fs.writeFileSync(path.join(OUT, `draws-${TAG}.json`), JSON.stringify({ conditions: 'headless Chromium, SwiftShader (ANGLE), 1280x720, default settings, new game ?nocine; each spot: enterRoom (+ hero placed/turned), game.step(2.0), two warm renders, then renderer.info of one composed frame (all passes). CPU-side counts only; no GPU timing.', rows }, null, 1));
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
